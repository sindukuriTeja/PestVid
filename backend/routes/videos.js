// --- Backend Routes: videos.js ---

const express = require('express');         // Import Express
const router = express.Router();            // Create a new router instance
const mongoose = require('mongoose');       // Import Mongoose (needed for ObjectId validation)
const Video = mongoose.model('Video');      // Get the Video Mongoose model
const Listing = mongoose.model('Listing');  // Get Listing model to check if video is used
const FundingRequest = mongoose.model('FundingRequest'); // Get FundingRequest model to check if video is used
const { authenticateToken } = require('./auth'); // Import the authentication middleware

// Helper function to generate a simulated transaction hash (can be used for video creation if needed)
// Although video creation itself isn't typically a "blockchain transaction" like a purchase or investment,
// linking metadata to a hash could simulate a chain link for the metadata itself.
const generateSimulatedTxHash = (prefix = 'sim_tx') => {
    return `${prefix}_${Date.now().toString(16)}${Math.random().toString(16).substring(2, 12)}`;
};


// --- Video Metadata Routes ---

// @route GET /api/videos
// @desc Get all videos metadata (can be filtered by query parameters)
// @access Public (Accessible to anyone, e.g., for a public AgriStream or browsing all videos)
// Query Params: ?farmerId=<userId>, ?purpose=<agristream|sell|funding>, ?crop=<cropName> etc.
router.get('/', async (req, res) => {
    try {
        // Build filter object from query parameters
        const filter = {};
        if (req.query.farmerId) {
             // Validate farmerId format if provided
             if (!mongoose.Types.ObjectId.isValid(req.query.farmerId)) {
                 return res.status(400).json({ message: 'Invalid Farmer ID format.' });
             }
            filter.farmerWallet = req.query.farmerId;
        }
        if (req.query.purpose) {
             // Validate purpose against schema enum if strict
             if (!['agristream', 'sell', 'funding'].includes(req.query.purpose)) {
                 // Optionally return error or just ignore invalid purpose
                 // return res.status(400).json({ message: 'Invalid purpose filter.' });
             } else {
                 filter.purpose = req.query.purpose;
             }
        }
        if (req.query.crop) {
             filter.crop = { $regex: req.query.crop, $options: 'i' }; // Case-insensitive search
        }
        // Add other filters as needed (e.g., location, pesticideCompany)

        // Find video documents based on the filter
        // Populate the farmerWallet field to get the farmer's name (and other public profile info if selected)
        const videos = await Video.find(filter)
                                  .populate('farmerWallet', 'name role displayIdentifier') // Populate farmer's _id, name, role, displayIdentifier
                                  .sort({ uploadTimestamp: -1 }); // Sort by newest upload first

        // Map to format for frontend (e.g., ensure _id is string)
         const formattedVideos = videos.map(video => ({
             _id: video._id.toString(),
             cid: video.cid,
             storageType: video.storageType,
             videoFileHash: video.videoFileHash,
             farmerWallet: video.farmerWallet ? video.farmerWallet._id.toString() : null, // Send farmer user ID string
             farmerName: video.farmerWallet ? (video.farmerWallet.name.split(' ')[0] || video.farmerWallet.displayIdentifier) : 'Unknown Farmer', // Farmer's display name
             crop: video.crop,
             pesticide: video.pesticide,
             location: video.location,
             pesticideCompany: video.pesticideCompany,
             purpose: video.purpose,
             uploadTimestamp: video.uploadTimestamp ? video.uploadTimestamp.toISOString() : null, // Send timestamp as ISO string
         }));


        // Send the list of video metadata
        res.json(formattedVideos); // Default status is 200 OK

    } catch (err) {
        console.error('GET /api/videos error:', err);
        res.status(500).json({ message: 'Server error fetching videos.' }); // 500 Internal Server Error
    }
});

// @route GET /api/videos/farmer/:farmerId
// @desc Get videos metadata uploaded by a specific farmer
// @access Private (Requires authentication. User should typically only fetch their own videos)
router.get('/farmer/:farmerId', authenticateToken, async (req, res) => {
    const farmerId = req.params.farmerId; // Get the farmer ID from the URL parameter

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
        return res.status(400).json({ message: 'Invalid Farmer ID format.' }); // 400 Bad Request
    }

    // Authorization: Ensure the authenticated user is the farmer whose videos are being requested.
    // Or allow an admin user to view any farmer's videos.
    if (req.user._id.toString() !== farmerId.toString() && req.user.role !== 'admin') {
        console.warn(`Authorization failed: User ${req.user._id} attempted to view videos for user ${farmerId}`);
        return res.status(403).json({ message: "Forbidden: You can only view your own videos." }); // 403 Forbidden
    }

    try {
        // Find video documents for the specified farmer
        // Populate farmerWallet to get farmer details if needed (though we just verified the ID matches req.user._id)
        const videos = await Video.find({ farmerWallet: farmerId })
                                  .populate('farmerWallet', 'name role displayIdentifier') // Populate farmer's _id, name, role
                                  .sort({ uploadTimestamp: -1 }); // Sort by newest upload first

        // Map to format for frontend
         const formattedVideos = videos.map(video => ({
             _id: video._id.toString(),
             cid: video.cid,
             storageType: video.storageType,
             videoFileHash: video.videoFileHash,
             farmerWallet: video.farmerWallet ? video.farmerWallet._id.toString() : null, // Send farmer user ID string
             farmerName: video.farmerWallet ? (video.farmerWallet.name.split(' ')[0] || video.farmerWallet.displayIdentifier) : 'Unknown Farmer',
             crop: video.crop,
             pesticide: video.pesticide,
             location: video.location,
             pesticideCompany: video.pesticideCompany,
             purpose: video.purpose,
             uploadTimestamp: video.uploadTimestamp ? video.uploadTimestamp.toISOString() : null, // Send timestamp as ISO string
         }));

        // Send the list of video metadata for this farmer
        res.json(formattedVideos); // Default status is 200 OK

    } catch (err) {
        console.error(`GET /api/videos/farmer/${farmerId} error:`, err);
        res.status(500).json({ message: 'Server error fetching farmer videos.' }); // 500 Internal Server Error
    }
});


// @route POST /api/videos
// @desc Create a new video metadata entry in the database
// @access Private (Requires authentication. Must be a farmer.)
// NOTE: This endpoint typically runs after the actual video file has been successfully uploaded
// to decentralized storage (like Storj or IPFS) from the frontend or a separate upload service.
// The request body should contain the metadata and the storage identifier (CID/Key).
router.post('/', authenticateToken, async (req, res) => {
    // Authorization: Ensure the authenticated user has the 'farmer' role.
    if (req.user.role !== 'farmer') {
        console.warn(`Authorization failed: User ${req.user._id} with role ${req.user.role} attempted to create video metadata.`);
        return res.status(403).json({ message: "Forbidden: Only users with the 'farmer' role can upload video metadata." }); // 403 Forbidden
    }

    // Extract video metadata from the request body
    const { cid, storageType, videoFileHash, crop, pesticide, location, pesticideCompany, purpose } = req.body;

    // Basic input validation
    if (!cid || !crop || !location || !purpose) {
         return res.status(400).json({ message: "Missing required video metadata fields (cid, crop, location, purpose)." }); // 400 Bad Request
    }
     if (storageType && !['storj', 'ipfs'].includes(storageType)) {
          return res.status(400).json({ message: "Invalid storage type specified." }); // 400 Bad Request
     }
     if (!['agristream', 'sell', 'funding'].includes(purpose)) {
         return res.status(400).json({ message: "Invalid purpose specified. Must be 'agristream', 'sell', or 'funding'." }); // 400 Bad Request
     }

    try {
        // Check if a video entry with this CID already exists (ensures CID uniqueness)
        const existingVideo = await Video.findOne({ cid: cid });
        if (existingVideo) {
            return res.status(409).json({ message: `Video metadata with CID "${cid}" already exists.` }); // 409 Conflict
        }

        // Create a new Video document instance
        const newVideo = new Video({
            cid: cid.trim(),
            storageType: storageType || 'ipfs', // Use provided type or default
            videoFileHash: videoFileHash ? videoFileHash.trim() : undefined, // Optional hash
            farmerWallet: req.user._id, // Link the video to the authenticated farmer's user ID
            crop: crop.trim(),
            pesticide: pesticide ? pesticide.trim() : undefined, // Optional
            location: location.trim(),
            pesticideCompany: pesticideCompany ? pesticideCompany.trim() : undefined, // Optional
            purpose: purpose,
            // uploadTimestamp defaults to now in the schema
        });

        // Save the new video metadata document to the database
        const savedVideo = await newVideo.save();

        // Optional: Trigger notifications here (e.g., notify public AgriStream viewers of a new video)
         // const notification = new Notification({
         //     global: true, // This could be a global notification
         //     type: 'video', // Custom notification type
         //     message: `New video uploaded: "${savedVideo.crop}" from a farmer!`,
         //      itemId: savedVideo._id, // Link to the video metadata document
         //      itemType: 'Video',
         //      // Could add a link or context like farmer name: farmerName: req.user.name.split(' ')[0]
         // });
         // await notification.save();
         // console.log(`SIMULATING: Created global notification for new video ${savedVideo._id}`);


        // Populate the farmerWallet field on the saved document before sending it back,
        // so the frontend immediately has the farmer's name associated with the video.
        await savedVideo.populate('farmerWallet', 'name role displayIdentifier');


        // Send a success response with the created video document
        res.status(201).json(savedVideo); // 201 Created

    } catch (err) {
        console.error('POST /api/videos error:', err);
         // Handle Mongoose validation errors
         if (err.name === 'ValidationError') {
              return res.status(400).json({ message: err.message });
         }
         // Handle duplicate key error (though we check explicitly above, Mongoose might throw it)
          if (err.code === 11000) {
              return res.status(409).json({ message: `Video metadata with CID "${cid}" already exists.` });
         }
        res.status(500).json({ message: 'Server error creating video metadata.' }); // 500 Internal Server Error
    }
});

// @route DELETE /api/videos/:id
// @desc Delete a video metadata entry by ID
// @access Private (Requires authentication. Must be a farmer and own the video. Cannot be used in listings/funding.)
router.delete('/:id', authenticateToken, async (req, res) => {
    const videoId = req.params.id; // Get the video ID from the URL parameter
    const userId = req.user._id;   // Authenticated user's ID

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        return res.status(400).json({ message: 'Invalid Video ID format.' }); // 400 Bad Request
    }

    try {
        // Find the video by ID
        const video = await Video.findById(videoId);

        // If video is not found, return 404
        if (!video) {
            return res.status(404).json({ message: 'Video not found.' }); // 404 Not Found
        }

        // Authorization: Ensure the authenticated user is the farmer who owns the video.
        if (video.farmerWallet.toString() !== userId.toString()) {
            console.warn(`Authorization failed: User ${userId} attempted to delete video ${videoId} owned by ${video.farmerWallet}`);
            return res.status(403).json({ message: "Forbidden: You can only delete your own videos." }); // 403 Forbidden
        }

        // Check if the video is currently used in any active marketplace listings
        // We check by video's CID and potentially farmer/status
        const isUsedInListing = await Listing.findOne({ cid: video.cid, status: 'active' }); // Assuming one active listing per video
        if (isUsedInListing) {
            return res.status(400).json({ message: `Cannot delete video: It is currently used in active marketplace listing "${isUsedInListing.crop}" (ID: ${isUsedInListing._id}). Please cancel or sell the listing first.` }); // 400 Bad Request
        }

        // Check if the video is currently used in any active or pending funding requests
        const isUsedInFunding = await FundingRequest.findOne({ cid: video.cid, status: { $in: ['pending', 'partially_funded', 'funded', 'growing'] } });
         if (isUsedInFunding) {
            return res.status(400).json({ message: `Cannot delete video: It is currently used in funding request "${isUsedInFunding.title}" (ID: ${isUsedInFunding._id}). Please cancel the request first.` }); // 400 Bad Request
         }


        // --- IMPORTANT: In a real application, you would also need to delete the actual video file ---
        // from the decentralized storage service (Storj/IPFS) here.
        // This typically involves using the SDK/API of the storage service on the backend.
        // This demo backend does NOT implement file deletion logic.
        console.log(`SIMULATING: Backend would now attempt to delete file from storage for CID: ${video.cid} (Storage Type: ${video.storageType})`);
        // Example Placeholder:
        // try {
        //    if (video.storageType === 'storj') {
        //       // Use Storj S3 SDK with credentials from .env to delete the object
        //       // const AWS = require('aws-sdk'); // Needs to be configured similar to frontend upload
        //       // ... s3.deleteObject({ Bucket: process.env.STORJ_BUCKET_NAME, Key: video.cid }).promise();
        //    } else if (video.storageType === 'ipfs') {
        //       // Use Pinata API or similar to unpin the CID
        //       // ... axios.delete(https://api.pinata.cloud/pinning/unpin/${video.cid}, { headers: { Authorization: Bearer ${process.env.PINATA_JWT} } });
        //    }
        //    console.log(Simulated file deletion for CID ${video.cid} successful.);
        // } catch (deleteError) {
        //    console.error(SIMULATION WARNING: Simulated file deletion failed for CID ${video.cid}:, deleteError.message);
            // Decide if you want to prevent deleting the DB record if file deletion fails.
            // For critical data, you might throw an error here. For a demo, maybe just log.
        // }


        // Delete the video document from the database
        await video.deleteOne(); // Use deleteOne() or findByIdAndDelete()

        // Send a success response
        res.json({ message: 'Video metadata removed successfully.' }); // Default status is 200 OK

    } catch (err) {
        console.error(`DELETE /api/videos/${videoId} error:`, err);
        // Handle potential errors during lookup or deletion
        res.status(500).json({ message: 'Server error deleting video metadata.' }); // 500 Internal Server Error
    }
});


// --- Export the router ---

// Export the configured router so it can be used by server.js
module.exports = router;