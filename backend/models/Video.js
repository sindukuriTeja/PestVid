// --- Mongoose Model: Video.js ---

const mongoose = require('mongoose'); // Import Mongoose library

// Define the schema for the Video model
const videoSchema = new mongoose.Schema({
    // MongoDB automatically adds an _id field (ObjectId) as the primary key.

    cid: {
        type: String,
        required: [true, 'Video CID/Key is required'], // The identifier from storage (Storj object key or IPFS CID)
        unique: true, // Ensure each video record is unique based on its CID/Key
        trim: true
    },
    storageType: {
        type: String,
        required: [true, 'Storage type is required'], // e.g., 'storj', 'ipfs'
        enum: {
            values: ['storj', 'ipfs'],
            message: 'Invalid storage type. Must be "storj" or "ipfs".'
        },
        default: 'ipfs' // Default to IPFS if not specified
    },
    videoFileHash: { // SHA256 hash of the video file for integrity verification
        type: String,
        trim: true
        // Not required, as calculating hash might fail or not be needed for all entries.
        // Can add unique: true if you want to prevent uploading the exact same file twice,
        // but this might block re-uploading the same video with different metadata.
    },
    farmerWallet: { // Reference to the User document representing the farmer who uploaded the video
        type: mongoose.Schema.Types.ObjectId, // This is a special Mongoose type for linking documents
        ref: 'User', // This tells Mongoose this field references the 'User' model
        required: [true, 'Farmer ID is required']
    },
    crop: {
        type: String,
        required: [true, 'Crop type is required'],
        trim: true
    },
    pesticide: { // Pesticide used (or 'None', 'Organic', etc.)
        type: String,
        trim: true
        // Not required as per your form, making it optional
    },
    location: { // Field location where the video was recorded
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    pesticideCompany: { // Company name for the pesticide used
        type: String,
        trim: true
        // Not required as per your form, making it optional
    },
    purpose: { // Intended purpose of the video upload
        type: String,
        required: [true, 'Purpose is required'],
        enum: {
            values: ['agristream', 'sell', 'funding'], // Values must match your frontend form purposes
            message: 'Invalid purpose. Must be "agristream", "sell", or "funding".'
        },
        default: 'agristream' // Default purpose if not explicitly set
    },
    uploadTimestamp: {
        type: Date,
        default: Date.now // Default to the current date and time when the video metadata is saved
    },
    // Add other fields as needed, e.g.:
    // fileSize: Number, // Size of the uploaded video file
    // duration: Number, // Duration of the video in seconds
    // status: { type: String, enum: ['processing', 'ready', 'error'], default: 'ready' } // Status after upload
});

// --- Create and Export the Model ---

// Create the Mongoose model from the schema.
// Mongoose automatically creates a collection named 'videos' (lowercase, plural) for this model.
const Video = mongoose.model('Video', videoSchema);

// Export the model so it can be used in other files (like route handlers or other models via ref)
module.exports = Video;
