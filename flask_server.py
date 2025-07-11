from flask import Flask, request, jsonify
import torch
from torch import nn
from transformers import CLIPProcessor, CLIPModel, T5TokenizerFast, T5ForConditionalGeneration
from PIL import Image
import numpy as np
from pathlib import Path
import warnings
import os
from typing import List
from dotenv import load_dotenv
from langchain_cohere import CohereEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_groq import ChatGroq
from langchain.schema import Document
from pinecone import Pinecone
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict
from flask_cors import CORS

# Ignore minor warnings
warnings.filterwarnings("ignore")
load_dotenv()

app = Flask(__name__)
CORS(app)

# --- 1. PLANT DISEASE PREDICTION SETUP ---
print("--- Initializing Plant Disease Prediction Models ---")

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

classes = ['Bacteria', 'Fungi', 'Healthy', 'Nematode', 'Pest', 'Phytopthora', 'Virus']
label_map = dict(zip(classes, range(len(classes))))

text_prompts = {
    "Bacteria": "a potato leaf infected with bacterial disease",
    "Fungi": "a potato leaf infected with fungal disease",
    "Healthy": "a healthy potato leaf with no disease",
    "Nematode": "a potato leaf infected with nematode disease",
    "Pest": "a potato leaf damaged by pests",
    "Phytopthora": "a potato leaf infected with phytopthora disease",
    "Virus": "a potato leaf infected with viral disease"
}

CLIP_MODEL_PATH = "best_vlm_model.pth"
T2T_MODEL_PATH = "best_t2t_recommendation_model.pth"
T2T_BASE_MODEL_NAME = "google/flan-t5-small"

# --- 2. RAG CHAT SETUP ---
print("--- Initializing RAG Chat System ---")

# API Keys
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY") or "pcsk_2zLsPR_TW281dRvebjuvjaL6MbQLawuMjQyiYWj6wog7FSddx6otQaFj4ESRenCCnqYnmh"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Initialize RAG components
embeddings = CohereEmbeddings(cohere_api_key=COHERE_API_KEY, model="embed-english-v3.0")
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index("hi")
vector_store = PineconeVectorStore(embedding=embeddings, index=index)
llm = ChatGroq(groq_api_key=GROQ_API_KEY, model_name="llama3-70b-8192", temperature=0.1)

# --- 3. MODEL DEFINITIONS ---
class CLIPFineTuner(nn.Module):
    def __init__(self, num_classes, unfreeze_layers=0):
        super(CLIPFineTuner, self).__init__()
        self.clip = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        for param in self.clip.parameters():
            param.requires_grad = False
        if unfreeze_layers > 0:
            for i, layer in enumerate(self.clip.vision_model.encoder.layers):
                if i >= len(self.clip.vision_model.encoder.layers) - unfreeze_layers:
                    for param in layer.parameters():
                        param.requires_grad = True
        projection_dim = self.clip.config.projection_dim
        self.classifier = nn.Sequential(
            nn.Linear(projection_dim, 512),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(512, num_classes)
        )

    def forward(self, batch):
        pixel_values = batch['pixel_values']
        input_ids = batch['input_ids']
        attention_mask = batch['attention_mask']
        vision_outputs = self.clip.vision_model(pixel_values=pixel_values)
        image_embeds = vision_outputs[1]
        image_features = self.clip.visual_projection(image_embeds)
        text_outputs = self.clip.text_model(input_ids=input_ids, attention_mask=attention_mask)
        text_embeds = text_outputs[1]
        text_features = self.clip.text_projection(text_embeds)
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        combined_features = image_features * 0.7 + text_features * 0.3
        logits = self.classifier(combined_features)
        return logits

class RAGState(TypedDict):
    question: str
    documents: List[Document]
    answer: str

# --- 4. HELPER FUNCTIONS ---
def get_clip_disease_prediction(clip_model, processor, image_path, device):
    image = Image.open(image_path).convert("RGB")
    class_scores = {}

    clip_model.eval()
    with torch.no_grad():
        for class_name in classes:
            text = text_prompts[class_name]
            inputs = processor(
                text=text,
                images=image,
                return_tensors="pt",
                padding="max_length",
                truncation=True,
                max_length=77
            )
            inputs = {k: v.to(device) for k, v in inputs.items()}
            logits = clip_model(inputs)
            class_idx = label_map[class_name]
            class_scores[class_name] = logits[0, class_idx].item()

    # Move scores_tensor to the same device
    scores_tensor = torch.tensor(list(class_scores.values()), device=device)
    probs = torch.softmax(scores_tensor, dim=0)
    all_probs = {name: prob.item() for name, prob in zip(class_scores.keys(), probs)}

    predicted_class = max(all_probs, key=all_probs.get)
    confidence = all_probs[predicted_class]

    return predicted_class, confidence, all_probs

def get_t2t_recommendation(t2t_model, t2t_tokenizer, disease_name, device):
    input_text = f"Recommend treatment for potato disease: {disease_name}"
    t2t_model.eval()
    with torch.no_grad():
        inputs = t2t_tokenizer(input_text, return_tensors="pt", padding=True, truncation=True).to(device)
        generated_ids = t2t_model.generate(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            max_length=512,
            num_beams=4,
            early_stopping=True
        )
        recommendation = t2t_tokenizer.decode(generated_ids[0], skip_special_tokens=True)
    return recommendation

def retrieve(state: RAGState) -> RAGState:
    docs = vector_store.similarity_search(state["question"], k=3)
    return {"question": state["question"], "documents": docs, "answer": ""}

def generate(state: RAGState) -> RAGState:
    context = "\n\n".join([doc.page_content for doc in state["documents"]])
    prompt = f"""You are an expert plant pathologist. Answer based on the research context.

Context: {context}

Question: {state["question"]}

Answer:"""
    response = llm.invoke(prompt)
    return {"question": state["question"], "documents": state["documents"], "answer": response.content}

def ask(question: str) -> str:
    """
    Ask a plant disease question and get an answer.
    
    Args:
        question (str): Your plant disease question
        
    Returns:
        str: Expert answer
    """
    try:
        result = rag.invoke({"question": question})
        return result["answer"]
    except Exception as e:
        return f"Error: {str(e)}"

# --- 5. INITIALIZE MODELS ---
print("\n--- Loading Models ---")

# Initialize plant disease prediction models
try:
    clip_model_loaded = CLIPFineTuner(num_classes=len(classes), unfreeze_layers=2)
    checkpoint = torch.load(CLIP_MODEL_PATH, map_location=device)
    clip_model_loaded.load_state_dict(checkpoint["model"])
    clip_model_loaded.to(device)
    clip_model_loaded.eval()
    clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    print("✅ CLIP Model loaded successfully.")
    CLIP_LOADED = True
except FileNotFoundError:
    print(f"❌ ERROR: CLIP model file not found at '{CLIP_MODEL_PATH}'.")
    CLIP_LOADED = False

try:
    t2t_tokenizer = T5TokenizerFast.from_pretrained(T2T_BASE_MODEL_NAME)
    t2t_model_loaded = T5ForConditionalGeneration.from_pretrained(T2T_BASE_MODEL_NAME)
    t2t_model_loaded.load_state_dict(torch.load(T2T_MODEL_PATH, map_location=device))
    t2t_model_loaded.to(device)
    t2t_model_loaded.eval()
    print("✅ T2T Recommendation Model loaded successfully.")
    T2T_LOADED = True
except FileNotFoundError:
    print(f"❌ ERROR: T2T model file not found at '{T2T_MODEL_PATH}'.")
    T2T_LOADED = False

# Initialize RAG workflow
workflow = StateGraph(RAGState)
workflow.add_node("retrieve", retrieve)
workflow.add_node("generate", generate)
workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)
rag = workflow.compile()
print("✅ RAG System initialized successfully.")

# --- 6. API ENDPOINTS ---
@app.route('/predict', methods=['POST'])
def predict():
    if not CLIP_LOADED or not T2T_LOADED:
        return jsonify({'error': 'Plant disease models are not properly loaded.'}), 500

    if 'file' not in request.files:
        return jsonify({'error': 'No image provided.'}), 400

    image_file = request.files['file']
    image_path = Path("temp_image.jpg")
    image_file.save(image_path)
    
    try:
        disease_class, confidence, all_probs = get_clip_disease_prediction(
            clip_model_loaded, clip_processor, image_path, device
        )
        
        recommendation = get_t2t_recommendation(
            t2t_model_loaded, t2t_tokenizer, disease_class, device
        )
        
        return jsonify({
            'disease': disease_class,
            'confidence': float(confidence),
            'all_probabilities': {k: float(v) for k, v in all_probs.items()},
            'recommendation': recommendation
        })
    except Exception as e:
        return jsonify({'error': f'Prediction error: {str(e)}'}), 500
    finally:
        # Clean up the temporary file
        if image_path.exists():
            image_path.unlink()

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    question = data.get('question', '')
    
    if not question:
        return jsonify({'error': 'Question is required'}), 400
    
    answer = ask(question)
    return jsonify({'question': question, 'answer': answer})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)




