// --- Mongoose Model: AvatarMessage.js ---

const mongoose = require('mongoose'); // Import Mongoose library

// Define the schema for the AvatarMessage model
const avatarMessageSchema = new mongoose.Schema({
    // MongoDB automatically adds an _id field (ObjectId) as the primary key.

    userId: { // Reference to the User document whose chat history this message belongs to
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Links to the 'User' model
        required: [true, 'User ID is required for avatar message']
    },
    sender: { // Who sent the message ('user' or 'bot')
        type: String,
        required: [true, 'Sender is required'],
        enum: {
            values: ['user', 'bot'], // Messages can come from the user or the avatar bot
            message: 'Invalid sender. Must be "user" or "bot".'
        }
    },
    text: { // The content of the avatar message
        type: String,
        required: [true, 'Message text is required'],
        trim: true,
        maxlength: [2000, 'Message text cannot exceed 2000 characters'] // Add a max length
    },
    timestamp: { // Date and time the message was sent/generated
        type: Date,
        default: Date.now // Default to the current date and time
    },
    readByUser: { // Status indicating if the user has seen this message (mainly for 'bot' messages)
        type: Boolean,
        default: false // Default to unread by user
    },

    // Add other fields as needed, e.g.:
    // contextData: Object, // Store context related to the message (e.g., current page)
    // actionSuggested: Object, // Store details of suggested actions
});

// Add an index on userId and timestamp for efficient querying and sorting of a user's chat history
avatarMessageSchema.index({ userId: 1, timestamp: 1 });


// --- Create and Export the Model ---

// Create the Mongoose model from the schema.
// Mongoose automatically creates a collection named 'avatarmessages' (lowercase, plural) for this model.
const AvatarMessage = mongoose.model('AvatarMessage', avatarMessageSchema);

// Export the model so it can be used in other files (like route handlers)
module.exports = AvatarMessage;