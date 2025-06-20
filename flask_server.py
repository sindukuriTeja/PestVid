from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import torch
from torch import nn
from transformers import CLIPProcessor, CLIPModel, T5TokenizerFast, T5ForConditionalGeneration
import warnings

# Ignore minor warnings
warnings.filterwarnings("ignore")

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Device configuration
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Class and label definitions
classes = ['Bacteria', 'Fungi', 'Healthy', 'Nematode', 'Pest', 'Phytopthora', 'Virus']
label_map = dict(zip(classes, range(len(classes))))

# Text prompts used for the CLIP model
text_prompts = {
    "Bacteria": "a potato leaf infected with bacterial disease",
    "Fungi": "a potato leaf infected with fungal disease",
    "Healthy": "a healthy potato leaf with no disease",
    "Nematode": "a potato leaf infected with nematode disease",
    "Pest": "a potato leaf damaged by pests",
    "Phytopthora": "a potato leaf infected with phytopthora disease",
    "Virus": "a potato leaf infected with viral disease"
}

# IMPORTANT: Update these paths to where your models are stored locally
CLIP_MODEL_PATH = "best_vlm_model.pth"
T2T_MODEL_PATH = "best_t2t_recommendation_model.pth"
T2T_BASE_MODEL_NAME = "google/flan-t5-small"

# Model class definition
class CLIPFineTuner(nn.Module):
    def __init__(self, num_classes, unfreeze_layers=0):
        super(CLIPFineTuner, self).__init__()
        self.clip = CLIPModel.from_pretrained("openai/clip-vit-base-patch32", trust_remote_code=True, use_safetensors=True)
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

# Prediction function
def get_clip_disease_prediction(clip_model, processor, image, device):
    """
    Predicts disease from a PIL image object.
    """
    image = image.convert("RGB")
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

    scores_tensor = torch.tensor(list(class_scores.values()))
    probs = torch.softmax(scores_tensor, dim=0)
    all_probs = {name: prob.item() for name, prob in zip(class_scores.keys(), probs)}

    predicted_class = max(all_probs, key=all_probs.get)
    confidence = all_probs[predicted_class]

    return predicted_class, confidence, all_probs

# Recommendation function
def get_t2t_recommendation(t2t_model, t2t_tokenizer, disease_name, device):
    """
    Generates treatment recommendation for a given disease name.
    """
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

# Load models
print("\n--- Loading Models into Memory ---")

# Load CLIP model
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
    print("❌ The CLIP prediction endpoint will not work.")
    CLIP_LOADED = False

# Load T2T Recommendation model
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
    print("❌ The recommendation endpoint will not work.")
    T2T_LOADED = False

@app.route('/predict', methods=['POST'])
def predict():
    if not (CLIP_LOADED and T2T_LOADED):
        return jsonify({'error': 'Models are not loaded, cannot process request.'}), 503

    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected for uploading'}), 400

    try:
        # Read the image in-memory
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # Perform prediction
        predicted_disease, confidence, _ = get_clip_disease_prediction(
            clip_model=clip_model_loaded,
            processor=clip_processor,
            image=image,
            device=device
        )
        
        # Get recommendation
        recommendation = get_t2t_recommendation(
            t2t_model=t2t_model_loaded,
            t2t_tokenizer=t2t_tokenizer,
            disease_name=predicted_disease,
            device=device
        )
        
        # Format response
        result = {
            'predicted_disease': predicted_disease,
            'confidence': f"{confidence:.2%}",
            'recommendation': recommendation
        }
        print(result)
        return jsonify(result)
    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({'error': f'An error occurred during prediction: {str(e)}'}), 500

@app.route('/', methods=['GET'])
def index():
    return "<h1>Plant Analysis API</h1><p>Send a POST request to /predict with an image file to get a prediction.</p>"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)