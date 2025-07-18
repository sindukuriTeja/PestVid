// --- Backend Routes: fundingRequests.js ---

const express = require('express');         // Import Express
const router = express.Router();            // Create a new router instance
const mongoose = require('mongoose');       // Import Mongoose
const FundingRequest = mongoose.model('FundingRequest'); // Get the FundingRequest Mongoose model
const Video = mongoose.model('Video');      // Get Video model to link to
const Investment = mongoose.model('Investment'); // Get Investment model to check for existing investments
const { authenticateToken } = require('./auth'); // Import the authentication middleware
const Notification = mongoose.model('Notification'); // Get Notification model for investor notifications


// Helper function to generate a simulated blockchain transaction hash
const generateSimulatedTxHash = (prefix = 'sim_tx') => {
    // Generates a unique-enough string for demo purposes based on timestamp and random number
    return `${prefix}_${Date.now().toString(16)}${Math.random().toString(16).substring(2, 12)}`;
};


// --- Funding Requests Routes ---

// @route GET /api/funding-requests
// @desc Get all active funding requests (pending or partially_funded) for investors to browse
// @access Public (Accessible to anyone, logged in or not)
// Query Params (matching frontend filters): ?crop=<cropName>, ?method=<method>, ?minRoi=<number>, ?maxAmount=<number>
router.get('/', async (req, res) => {
    try {
        // Start with filter for active/seeking funding statuses
        const filter = { status: { $in: ['pending', 'partially_funded'] } };

        // Add filters based on query parameters from the frontend (investorFilters)
        if (req.query.crop) {
             // Case-insensitive exact match for crop type
            filter.crop = req.query.crop.trim(); // Assume frontend sends exact match value from select
            // If frontend sends partial text, use regex: filter.crop = { $regex: req.query.crop.trim(), $options: 'i' };
        }
        if (req.query.method) {
             // Exact match for method
            filter.method = req.query.method.trim(); // Assume frontend sends exact match value from select
        }

        // Handle numeric filters for ROI and Amount
         const numericFilters = {};
         if (req.query.minRoi) {
              const minRoi = parseFloat(req.query.minRoi);
              if (!isNaN(minRoi) && minRoi >= 0) {
                  numericFilters.roi = { $gte: minRoi };
              }
         }
         if (req.query.maxAmount) {
             const maxAmount = parseFloat(req.query.maxAmount);
              if (!isNaN(maxAmount) && maxAmount >= 0) {
                  numericFilters.amount = { $lte: maxAmount };
              }
         }

         // Combine numeric filters with the main filter
         if (Object.keys(numericFilters).length > 0) {
             // If there are existing conditions in filter, use $and
             if (Object.keys(filter).length > 0) {
                 filter.$and = Object.keys(filter).map(key => ({ [key]: filter[key] })); // Convert existing filters to $and array
                 delete filter.status; // Remove status from the main filter if added to $and
                 // Add numeric filters to the $and array
                 Object.keys(numericFilters).forEach(key => {
                      const condition = {};
                      condition[key] = numericFilters[key];
                      filter.$and.push(condition);
                 });
             } else {
                 // If no existing filters, just use the numeric filters directly
                 Object.assign(filter, numericFilters);
             }
         }


        // Find funding request documents based on the filter
        // Populate the farmerWallet field to get the farmer's name for display
        const requests = await FundingRequest.find(filter)
                                           .populate('farmerWallet', 'name role displayIdentifier') // Populate farmer's _id, name, role
                                            // Optionally populate investors and updates here if needed for the list view,
                                            // but usually only basic info is needed. Full details fetched when viewing project.
                                           .sort({ createdAt: -1 }); // Sort by newest request first

        // Map to format for frontend (e.g., ensure _id is string, format dates)
         const formattedRequests = requests.map(request => ({
             _id: request._id.toString(),
             farmerWallet: request.farmerWallet ? request.farmerWallet._id.toString() : null,
             farmerName: request.farmerWallet ? (request.farmerWallet.name.split(' ')[0] || request.farmerWallet.displayIdentifier) : 'Unknown Farmer',
             title: request.title,
             crop: request.crop,
             acres: request.acres,
             amount: request.amount,
             method: request.method,
             cid: request.cid,
             videoStorageType: request.videoStorageType,
             videoFileHash: request.videoFileHash,
             description: request.description,
             timeline: request.timeline,
             roi: request.roi,
             investorShare: request.investorShare,
             fundedAmount: request.fundedAmount,
             status: request.status,
             createdAt: request.createdAt ? request.createdAt.toISOString() : null, // ISO string date
             // Investors and updates might be large, send only counts or summary in list view:
             investorCount: request.investors ? request.investors.length : 0,
             updateCount: request.updates ? request.updates.length : 0,
             // isNew: client-side state, not stored in DB
         }));


        // Send the list of funding requests
        res.json(formattedRequests); // Default status is 200 OK

    } catch (err) {
        console.error('GET /api/funding-requests error:', err);
        res.status(500).json({ message: 'Server error fetching funding requests.' }); // 500 Internal Server Error
    }
});

// @route GET /api/funding-requests/farmer/:farmerId
// @desc Get funding requests created by a specific farmer (all statuses)
// @access Private (Requires authentication. User should typically only fetch their own requests)
router.get('/farmer/:farmerId', authenticateToken, async (req, res) => {
    const farmerId = req.params.farmerId; // Get the farmer ID from the URL parameter
    const userId = req.user._id;         // Authenticated user's ID

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
        return res.status(400).json({ message: 'Invalid Farmer ID format.' }); // 400 Bad Request
    }

    // Authorization: Ensure the authenticated user is the farmer whose requests are being requested.
    // Or allow an admin user to view any farmer's requests.
    if (userId.toString() !== farmerId.toString() && req.user.role !== 'admin') {
         console.warn(`Authorization failed: User ${userId} attempted to view funding requests for user ${farmerId}`);
        return res.status(403).json({ message: "Forbidden: You can only view your own funding requests." }); // 403 Forbidden
    }

    try {
        // Find funding request documents for the specified farmer (all statuses)
        // Populate farmerWallet field if needed (though we just verified the ID matches req.user._id)
        // Populate investors and updates here as this is the farmer's view of their own requests
        const requests = await FundingRequest.find({ farmerWallet: farmerId })
                                           .populate('farmerWallet', 'name role displayIdentifier')
                                           .populate('investors.investorId', 'name role displayIdentifier') // Populate investor names within the embedded array
                                           .sort({ createdAt: -1 }); // Sort by newest first

        // Map to format for frontend
        const formattedRequests = requests.map(request => ({
             _id: request._id.toString(),
             farmerWallet: request.farmerWallet ? request.farmerWallet._id.toString() : null,
             farmerName: request.farmerWallet ? (request.farmerWallet.name.split(' ')[0] || request.farmerWallet.displayIdentifier) : 'Unknown Farmer',
             title: request.title,
             crop: request.crop,
             acres: request.acres,
             amount: request.amount,
             method: request.method,
             cid: request.cid,
             videoStorageType: request.videoStorageType,
             videoFileHash: request.videoFileHash,
             description: request.description,
             timeline: request.timeline,
             roi: request.roi,
             investorShare: request.investorShare,
             fundedAmount: request.fundedAmount,
             status: request.status,
             createdAt: request.createdAt ? request.createdAt.toISOString() : null,
             // Format embedded investors for frontend
             investors: request.investors.map(inv => ({
                 investorId: inv.investorId ? inv.investorId._id.toString() : null,
                 investorName: inv.investorId ? (inv.investorId.name.split(' ')[0] || inv.investorId.displayIdentifier) : 'Unknown Investor',
                 amount: inv.amount,
                 txHash: inv.txHash,
                 investmentDate: inv.investmentDate ? inv.investmentDate.toISOString() : null,
             })),
             // Format embedded updates for frontend
             updates: request.updates.map(update => ({
                 id: update.id, // Keep client-side demo ID if needed, Mongoose _id is better
                 date: update.date, // Keep string date format for demo consistency
                 text: update.text,
                 // Add timestamp if you switch to Date objects
             })),
        }));

        // Send the list of funding requests for this farmer
        res.json(formattedRequests); // Default status is 200 OK

    } catch (err) {
        console.error(`GET /api/funding-requests/farmer/${farmerId} error:`, err);
        res.status(500).json({ message: 'Server error fetching farmer funding requests.' }); // 500 Internal Server Error
    }
});

// @route GET /api/funding-requests/:id
// @desc Get details for a specific funding request
// @access Public (Anyone can view project details)
router.get('/:id', async (req, res) => {
     const requestId = req.params.id; // Get the request ID from the URL parameter

     // Validate the ID format
     if (!mongoose.Types.ObjectId.isValid(requestId)) {
         return res.status(400).json({ message: 'Invalid Funding Request ID format.' }); // 400 Bad Request
     }

     try {
         // Find the funding request by ID
         // Populate farmer and investors for full details
         const request = await FundingRequest.findById(requestId)
                                             .populate('farmerWallet', 'name role displayIdentifier')
                                             .populate('investors.investorId', 'name role displayIdentifier');


         // If request is not found, return 404
         if (!request) {
             return res.status(404).json({ message: 'Funding request not found.' }); // 404 Not Found
         }

         // Map to format for frontend
         const formattedRequest = {
             _id: request._id.toString(),
             farmerWallet: request.farmerWallet ? request.farmerWallet._id.toString() : null,
             farmerName: request.farmerWallet ? (request.farmerWallet.name.split(' ')[0] || request.farmerWallet.displayIdentifier) : 'Unknown Farmer',
             title: request.title,
             crop: request.crop,
             acres: request.acres,
             amount: request.amount,
             method: request.method,
             cid: request.cid,
             videoStorageType: request.videoStorageType,
             videoFileHash: request.videoFileHash,
             description: request.description,
             timeline: request.timeline,
             roi: request.roi,
             investorShare: request.investorShare,
             fundedAmount: request.fundedAmount,
             status: request.status,
             createdAt: request.createdAt ? request.createdAt.toISOString() : null,
              // Format embedded investors for frontend
             investors: request.investors.map(inv => ({
                 investorId: inv.investorId ? inv.investorId._id.toString() : null,
                 investorName: inv.investorId ? (inv.investorId.name.split(' ')[0] || inv.investorId.displayIdentifier) : 'Unknown Investor',
                 amount: inv.amount,
                 txHash: inv.txHash,
                 investmentDate: inv.investmentDate ? inv.investmentDate.toISOString() : null,
             })),
             // Format embedded updates for frontend
             updates: request.updates.map(update => ({
                 id: update.id, // Keep client-side demo ID if needed, Mongoose _id is better
                 date: update.date, // Keep string date format for demo consistency
                 text: update.text,
                 // Add timestamp if you switch to Date objects
             })),
         };

         // Send the funding request details
         res.json(formattedRequest); // Default status is 200 OK

     } catch (err) {
         console.error(`GET /api/funding-requests/${requestId} error:`, err);
         res.status(500).json({ message: 'Server error fetching funding request details.' }); // 500 Internal Server Error
     }
 });


// @route POST /api/funding-requests
// @desc Create a new funding request
// @access Private (Requires authentication. Must be a farmer.)
router.post('/', authenticateToken, async (req, res) => {
    // Authorization: Ensure the authenticated user has the 'farmer' role.
    if (req.user.role !== 'farmer') {
         console.warn(`Authorization failed: User ${req.user._id} with role ${req.user.role} attempted to create a funding request.`);
        return res.status(403).json({ message: "Forbidden: Only users with the 'farmer' role can create funding requests." }); // 403 Forbidden
    }

    // Extract funding request details from the request body
    const { title, crop, acres, amount, method, cid, description, timeline, roi, investorShare } = req.body;

    // Basic input validation - checking for required fields and types
     const requiredFields = ['title', 'crop', 'acres', 'amount', 'method', 'cid', 'description', 'timeline', 'roi', 'investorShare'];
     for (const field of requiredFields) {
         if (req.body[field] === undefined || req.body[field] === null || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
              return res.status(400).json({ message: `Missing required field: ${field}.` }); // 400 Bad Request
         }
     }

     const parsedAcres = parseFloat(acres);
     const parsedAmount = parseFloat(amount);
     const parsedTimeline = parseInt(timeline, 10);
     const parsedRoi = parseFloat(roi);
     const parsedInvestorShare = parseFloat(investorShare);

      // Numeric validation
     if (isNaN(parsedAcres) || parsedAcres <= 0 ||
         isNaN(parsedAmount) || parsedAmount <= 0 ||
         isNaN(parsedTimeline) || parsedTimeline <= 0 ||
         isNaN(parsedRoi) || parsedRoi < 0 || parsedRoi > 100 ||
         isNaN(parsedInvestorShare) || parsedInvestorShare < 0 || parsedInvestorShare > 100)
     {
         return res.status(400).json({ message: "Invalid numeric values provided for acres, amount, timeline, roi, or investorShare." }); // 400 Bad Request
     }

     // Enum validation for method (matches schema)
     if (!['organic', 'conventional', 'hydroponic', 'aquaponic', 'regenerative'].includes(method)) {
          return res.status(400).json({ message: "Invalid growing method specified." }); // 400 Bad Request
     }


    try {
        // Find the associated video metadata by CID and ensure it belongs to the authenticated farmer.
        // This validates that the farmer is using their own video as evidence.
        const video = await Video.findOne({ cid: cid, farmerWallet: req.user._id });

        // If video is not found or doesn't belong to the farmer, return 404 or 403.
        if (!video) {
             console.warn(`Validation failed: Video with CID ${cid} not found for farmer ${req.user._id} during funding request creation.`);
            return res.status(404).json({ message: "Associated video not found or does not belong to you." }); // 404 Not Found
        }

         // Check if this video is already used in a pending, partially_funded, funded, or growing request.
         // This prevents a farmer from using the same video for multiple simultaneous active funding requests.
         const existingActiveRequest = await FundingRequest.findOne({ cid: cid, status: { $in: ['pending', 'partially_funded', 'funded', 'growing'] } });
         if (existingActiveRequest) {
             console.warn(`Validation failed: Video with CID ${cid} is already used in active funding request ${existingActiveRequest._id}.`);
             return res.status(409).json({ message: "This video is already being used in an active funding request." }); // 409 Conflict
         }


        // Create a new FundingRequest document instance
        const newRequest = new FundingRequest({
            farmerWallet: req.user._id, // Link to the authenticated farmer's user ID
            title: title.trim(),
            crop: crop.trim(),
            acres: parsedAcres,
            amount: parsedAmount,
            method: method,
            cid: video.cid, // Link the video CID
            videoStorageType: video.storageType, // Use video's storage type
            videoFileHash: video.videoFileHash, // Use video's hash
            description: description.trim(),
            timeline: parsedTimeline,
            roi: parsedRoi,
            investorShare: parsedInvestorShare,
            // fundedAmount and status default to 0 and 'pending' in the schema
            // investors and updates default to empty arrays in the schema
            createdAt: new Date(), // Set creation date
        });

        // Save the new funding request document to the database
        const savedRequest = await newRequest.save();

        // Optional: Send notification to potential investors.
        // This should ideally be a background task, but for demo, we create a global notification.
         try {
              const notification = new Notification({
                  global: true, // This is a global notification for the investment marketplace
                  type: 'funding', // Custom notification type
                  message: `New investment opportunity: "${savedRequest.title}" by a farmer is seeking funding!`,
                  itemId: savedRequest._id, // Link to the new funding request document
                  itemType: 'FundingRequest',
              });
              await notification.save();
             console.log(`SIMULATING: Created global notification for new funding request ${savedRequest._id}.`);

             // Note: Unlike listings, we don't have a notificationSent flag on FundingRequest schema yet.
             // If you need to track this, add it to the schema and save the request again.

         } catch (notificationError) {
             console.error('Error creating notification for new funding request:', notificationError);
             // Do not block request creation if notification fails, but log it.
         }


        // Populate the farmerWallet field on the saved document before sending it back,
        // so the frontend immediately has the farmer's name associated.
        await savedRequest.populate('farmerWallet', 'name role displayIdentifier');


        // Send a success response with the created funding request document
        res.status(201).json(savedRequest); // 201 Created

    } catch (err) {
        console.error('POST /api/funding-requests error:', err);
         // Handle Mongoose validation errors
         if (err.name === 'ValidationError') {
              return res.status(400).json({ message: err.message });
         }
         // Handle duplicate key error (less likely now with specific checks, but keep)
          if (err.code === 11000) {
              return res.status(409).json({ message: `A funding request using this video CID already exists.` });
         }
        res.status(500).json({ message: 'Server error creating funding request.' }); // 500 Internal Server Error
    }
});

// @route PUT /api/funding-requests/:id
// @desc Update a funding request (e.g., add a progress update, change status - farmer only)
// @access Private (Requires authentication. Must be a farmer and own the request.)
// Request Body can include: { updateText: "...", status: "completed" }
router.put('/:id', authenticateToken, async (req, res) => {
    const requestId = req.params.id; // Get the request ID from the URL parameter
    const userId = req.user._id;     // Authenticated user's ID
    const { updateText, status } = req.body; // Get update data from body

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ message: 'Invalid Funding Request ID format.' }); // 400 Bad Request
    }

    // Check if there's anything to update
     if (!updateText && status === undefined) {
         return res.status(400).json({ message: 'No update data provided (updateText or status).' });
     }


    try {
        // Find the funding request by ID
        const request = await FundingRequest.findById(requestId);

        // If request is not found, return 404
        if (!request) {
            return res.status(404).json({ message: 'Funding request not found.' }); // 404 Not Found
        }

        // Authorization: Ensure the authenticated user is the farmer who owns the request.
        if (request.farmerWallet.toString() !== userId.toString()) {
             console.warn(`Authorization failed: User ${userId} attempted to update funding request ${requestId} owned by ${request.farmerWallet}`);
            return res.status(403).json({ message: "Forbidden: You can only update your own funding requests." }); // 403 Forbidden
        }

        // --- Apply Updates ---

        let notificationSent = false; // Flag to track if notifications were sent

        // 1. Add a new progress update if updateText is provided
        if (updateText && updateText.trim() !== '') {
            const newUpdate = {
                // Using Mongoose's default _id for embedded documents is generally better than client-side IDs
                // id: update_${Date.now()}_${Math.random().toString(16).substring(2,6)}, // Original demo client ID format
                _id: new mongoose.Types.ObjectId(), // Use Mongoose ObjectId for embedded document ID
                date: new Date().toLocaleDateString(), // Keep string date format for demo consistency
                // If you switch to Date objects for updates, set timestamp: new Date()
                text: updateText.trim(),
            };
             // Ensure the 'updates' array exists
             if (!request.updates) {
                 request.updates = [];
             }
            request.updates.push(newUpdate);
             console.log(`Added new update to request ${requestId}`);

             // Notify investors in this specific project about the new update
             // Find all investments linked to this project to get investor IDs
              const investorsInProject = await Investment.find({ projectId: requestId }).distinct('investorWallet');

              if (investorsInProject && investorsInProject.length > 0) {
                  const notifications = investorsInProject.map(investorId => ({
                      recipient: investorId, // Target the specific investor
                      type: 'update', // Custom notification type
                      message: `Update posted for project "${request.title}" (${newUpdate.date}): ${newUpdate.text.substring(0, 50)}...`,
                      itemId: request._id, // Link to the funding request document
                      itemType: 'FundingRequest',
                      // Add a way to link to the specific update? Maybe include update._id
                      read: false, // Initially unread for the investor
                  }));
                  // Use insertMany for efficiency
                  await Notification.insertMany(notifications);
                  console.log(`SIMULATING: Notified ${investorsInProject.length} investors about update for request ${requestId}`);
                  notificationSent = true;
              }
        }

        // 2. Update status if provided
        if (status !== undefined) {
            // Basic validation for status transition if needed (e.g., can only go from pending/partial to funded/completed/cancelled)
            // Ensure the new status is valid according to the schema enum
            if (!['pending', 'partially_funded', 'funded', 'completed', 'cancelled'].includes(status)) {
                 return res.status(400).json({ message: `Invalid status value provided: ${status}.` });
            }

            // Implement status transition logic if necessary (e.g., if status is 'completed', trigger payouts if not already)
             if (status === 'completed' && request.status !== 'completed') {
                  // This transition might trigger payout logic if not handled elsewhere
                  console.log(`SIMULATING: Project ${requestId} status changed to completed.`);
                  // Payout simulation is currently handled in Investment.js PUT /progress,
                  // triggered when individual investments reach 100% progress and project becomes fully funded.
                  // Ensure your logic flow aligns. If 'completed' status is set manually by farmer,
                  // you might need different payout logic here.
             }
             // Prevent changing status if already cancelled or completed, unless specifically allowed
              if (request.status === 'cancelled' || request.status === 'completed') {
                   // Allow farmer to set completed? Or only via automated process?
                   // Disallowing for simplicity unless specifically coded otherwise
                   if (status !== request.status) { // Only allow changing status if it's actually a different status
                        return res.status(400).json({ message: `Cannot change status from terminal state "${request.status}".` });
                   }
              }


            request.status = status; // Update the status field
        }

        // Save the updated funding request document
        // Note: Mongoose automatically handles updates to embedded arrays like 'updates' and 'investors'
        const updatedRequest = await request.save();

        // Populate fields for the response
        await updatedRequest.populate('farmerWallet', 'name role displayIdentifier')
                            .populate('investors.investorId', 'name role displayIdentifier');


        // Send a success response with the updated funding request document
         res.json({ message: 'Funding request updated successfully.', request: updatedRequest, notificationSent: notificationSent }); // Default status is 200 OK

    } catch (err) {
        console.error(`PUT /api/funding-requests/${requestId} update error:`, err);
        // Handle potential Mongoose validation errors (e.g., if status is invalid)
         if (err.name === 'ValidationError') {
              return res.status(400).json({ message: err.message });
         }
        res.status(500).json({ message: 'Server error updating funding request.' }); // 500 Internal Server Error
    }
});


// @route DELETE /api/funding-requests/:id
// @desc Cancel a funding request
// @access Private (Requires authentication. Must be a farmer and own the request. Cannot be funded.)
router.delete('/:id', authenticateToken, async (req, res) => {
    const requestId = req.params.id; // Get the request ID from the URL parameter
    const userId = req.user._id;     // Authenticated user's ID

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ message: 'Invalid Funding Request ID format.' }); // 400 Bad Request
    }

    try {
        // Find the funding request by ID
        const request = await FundingRequest.findById(requestId);

        // If request is not found, return 404
        if (!request) {
            return res.status(404).json({ message: 'Funding request not found.' }); // 404 Not Found
        }

        // Authorization: Ensure the authenticated user is the farmer who owns the request.
        if (request.farmerWallet.toString() !== userId.toString()) {
             console.warn(`Authorization failed: User ${userId} attempted to cancel funding request ${requestId} owned by ${request.farmerWallet}`);
            return res.status(403).json({ message: "Forbidden: You can only cancel your own funding requests." }); // 403 Forbidden
        }

        // Prevent cancellation if the request has received any funding.
        // In a real system, cancellation after funding would involve complex refund logic.
        if (request.fundedAmount > 0) {
             console.warn(`Attempted to cancel funded request: ${requestId} with fundedAmount ${request.fundedAmount}`);
             // For demo, we allow it IF explicitly confirmed on the frontend (like your demo does)
             // But here, we'll enforce that you can't cancel if funded > 0 via the API.
             // If you need to allow it with admin rights or specific flag, modify this check.
            return res.status(400).json({ message: "Cannot cancel funding request: It has already received funding." }); // 400 Bad Request
        }

        // Delete the funding request document from the database
        // Use deleteOne() or findByIdAndDelete()
        await request.deleteOne();

        // Optional: Notify interested investors that the request was cancelled (if they exist)
        // This would typically happen if you allowed cancellation even with fundedAmount > 0,
        // or if you want to notify investors who saw the request but didn't invest.
        // Given we prevent cancellation if fundedAmount > 0, there are no investors to refund here.


        // Send a success response
        res.json({ message: 'Funding request cancelled successfully.' }); // Default status is 200 OK

    } catch (err) {
        console.error(`DELETE /api/funding-requests/${requestId} cancel error:`, err);
        res.status(500).json({ message: 'Server error cancelling funding request.' }); // 500 Internal Server Error
    }
});


// --- Export the router ---

// Export the configured router so it can be used by server.js
module.exports = router;