// --- Backend Routes: ai.js ---

const express = require('express');         // Import Express
const router = express.Router();            // Create a new router instance
const dotenv = require('dotenv');           // Import dotenv
const axios = require('axios');             // Import axios for making HTTP requests (to external AI APIs)
const { authenticateToken } = require('./auth'); // Import the authentication middleware

// Load environment variables again in this file if it might be run or tested in isolation,
// although typically server.js loads them globally for the process. It's safe practice.
dotenv.config();

// Get API keys from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Base URLs for the external AI services
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';


// --- AI Proxy Routes ---

// @route POST /api/ai/analyze-plant
// @desc Proxies request to Google Gemini Vision for plant image analysis.
// @access Private (Requires authentication. Could be restricted to 'farmer' role.)
router.post('/analyze-plant', authenticateToken, async (req, res) => {
    // Optional: Restrict this feature to the 'farmer' role
     if (req.user.role !== 'farmer') {
          console.warn(`Authorization failed: Non-farmer user ${req.user._id} attempted to use analyze-plant.`);
         return res.status(403).json({ message: "Forbidden: Only farmers can use the plant analysis feature." }); // 403 Forbidden
     }

    // Check if the Gemini API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('YOUR_GEMINI_API_KEY')) {
        console.error("AI Service Configuration Error: Gemini API Key not configured in backend .env");
        return res.status(500).json({ message: "Plant analysis service is not configured on the server." }); // 500 Internal Server Error
    }

    // Extract data from the request body sent by the frontend
    // The frontend should send the image as base64 data along with its MIME type.
    const { mimeType, base64Data } = req.body;

    // Basic input validation
    if (!mimeType || !base64Data) {
        return res.status(400).json({ message: "Missing image data (mimeType or base64Data)." }); // 400 Bad Request
    }
     if (!base64Data.match(/^[a-zA-Z0-9+/=]+$/)) { // Simple check for valid base64 characters
          return res.status(400).json({ message: "Invalid base64 data format." }); // 400 Bad Request
     }


    try {
        // Construct the payload required by the Google Gemini API
        // The prompt specifies the desired output format.
        const prompt = "Analyze this plant image. Identify: PLANT: [Name]; DISEASE: [Name/Healthy/Not Apparent/Unknown]; TREATMENT: [Suggestions]. If uncertain, state Unknown/Not Apparent. Provide the response strictly in this format. Keep the treatment suggestions concise.";

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt }, // Text part with instructions
                    { inline_data: { mime_type: mimeType, data: base64Data } } // Image data part
                ]
            }],
            // Configure generation parameters (temperature, topK, etc.)
             generationConfig: {
                 temperature: 0.4,
                 topK: 32,
                 topP: 1,
                 maxOutputTokens: 1024,
             },
        };

        console.log(`Sending request to Gemini for plant analysis (User: ${req.user._id})...`);

        // Make the POST request to the Google Gemini API
        const geminiResponse = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, // API key in query parameter
            requestBody,
            {
                 headers: { 'Content-Type': 'application/json' } // Specify content type
            }
        );

        // Process the response from Gemini
        // The response structure can vary, so check properties carefully.
        if (geminiResponse.data && geminiResponse.data.candidates && geminiResponse.data.candidates[0] && geminiResponse.data.candidates[0].content && geminiResponse.data.candidates[0].content.parts && geminiResponse.data.candidates[0].content.parts[0]) {
            const analysisResultText = geminiResponse.data.candidates[0].content.parts[0].text;

            // Send the raw text response back to the frontend.
            // The frontend can then parse this text if needed.
            res.json({ rawText: analysisResultText }); // Default status is 200 OK

        } else {
            // Handle cases where API responds successfully but the response structure is unexpected
            console.error("Unexpected Gemini response structure:", JSON.stringify(geminiResponse.data, null, 2));
            res.status(500).json({ message: "AI service returned unexpected data format." }); // 500 Internal Server Error
        }

    } catch (error) {
        console.error('Gemini API error:', error.response?.data || error.message);

         // More specific error handling based on API response status or body
         if (error.response) {
              // Handle API errors (e.g., rate limits, invalid request)
              res.status(error.response.status).json({
                   message: error.response.data?.error?.message || 'Error from AI service.',
                   errorDetails: error.response.data // Include full error response for debugging
              });
         } else {
              // Handle network errors or other request issues
              res.status(500).json({ message: "Error communicating with plant analysis service.", error: error.message });
         }
    }
});


// @route POST /api/ai/chatbot
// @desc Proxies request to Groq Chat Completion for the chatbot (AgriBot/Avatar Helper).
// @access Private (Requires authentication. Could be restricted to specific roles like 'farmer' for AgriBot.)
router.post('/chatbot', authenticateToken, async (req, res) => {
     // Optional: Restrict this feature to the 'farmer' role for AgriBot
     // If using for general Avatar helper, allow all authenticated roles.
      if (req.user.role !== 'farmer') { // Adjust if Avatar uses a different route or logic
           console.warn(`Authorization failed: Non-farmer user ${req.user._id} attempted to use AgriBot.`);
          return res.status(403).json({ message: "Forbidden: Only farmers can use the AgriBot feature." }); // 403 Forbidden
      }


    // Check if the Groq API key is configured
    if (!GROQ_API_KEY || GROQ_API_KEY.startsWith('YOUR_GROQ_API_KEY')) {
        console.error("AI Service Configuration Error: Groq API Key not configured in backend .env");
        return res.status(500).json({ message: "AgriBot service is not configured on the server." }); // 500 Internal Server Error
    }

    // Extract data from the request body sent by the frontend
    // The frontend should send the message history and the current system prompt.
    const { messages, systemPrompt } = req.body;

    // Basic input validation
     // Messages should be an array, systemPrompt should be a string
    if (!Array.isArray(messages) || !systemPrompt || typeof systemPrompt !== 'string') {
         return res.status(400).json({ message: "Invalid chat data format (messages array and systemPrompt string required)." }); // 400 Bad Request
    }

    // Construct the payload required by the Groq API (OpenAI compatible format)
    // The system prompt should be the first message in the history.
     const messagesPayload = [{ role: 'system', content: systemPrompt }, ...messages];


    try {
        console.log(`Sending request to Groq for chatbot response (User: ${req.user._id}, Role: ${req.user.role})...`);

        // Make the POST request to the Groq API
        const groqResponse = await axios.post(
            GROQ_API_URL,
            {
                messages: messagesPayload,
                model: "llama3-8b-8192", // Specify the AI model to use (from Groq's available models)
                temperature: 0.7,       // Adjust creativity (0-1)
                max_tokens: 1024,       // Max tokens in the response
                top_p: 1,
                stream: false,          // Set to true for streaming responses (requires different frontend handling)
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`, // API key in Authorization header
                    'Content-Type': 'application/json'
                }
            }
        );

        // Process the response from Groq (OpenAI compatible response structure)
        if (groqResponse.data && groqResponse.data.choices && groqResponse.data.choices[0] && groqResponse.data.choices[0].message) {
            const botMessageContent = groqResponse.data.choices[0].message.content;

             // Optional: Save the conversation messages to the database here if you want persistence
             // The frontend might already be sending the full history for context.
             // Saving could involve iterating over messages and botMessageContent
             // and creating AvatarMessage documents linked to req.user._id.
             // This is not implemented in this demo route for simplicity.


            // Send the AI's response text back to the frontend
            res.json({ text: botMessageContent }); // Default status is 200 OK

        } else {
            // Handle cases where API responds successfully but the response structure is unexpected
            console.error("Unexpected Groq response structure:", JSON.stringify(groqResponse.data, null, 2));
            res.status(500).json({ message: "AgriBot service returned unexpected data format." }); // 500 Internal Server Error
        }

    } catch (error) {
        console.error('Groq API error:', error.response?.data || error.message);

         // More specific error handling based on API response status or body
         if (error.response) {
              // Handle API errors (e.g., rate limits, invalid key, model errors)
              res.status(error.response.status).json({
                   message: error.response.data?.error?.message || 'Error from AI service.',
                   errorDetails: error.response.data // Include full error response for debugging
              });
         } else {
              // Handle network errors or other request issues
              res.status(500).json({ message: "Error communicating with AgriBot service.", error: error.message });
         }
    }
});


// --- Export the router ---

// Export the configured router so it can be used by server.js
module.exports = router;