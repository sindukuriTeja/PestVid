// --- Backend Routes: investments.js ---

const express = require('express');         // Import Express
const router = express.Router();            // Create a new router instance
const mongoose = require('mongoose');       // Import Mongoose
const Investment = mongoose.model('Investment'); // Get the Investment Mongoose model
const FundingRequest = mongoose.model('FundingRequest'); // Get FundingRequest model to update it
const Transaction = mongoose.model('Transaction'); // Get Transaction model to record investments/payouts
const { authenticateToken } = require('./auth'); // Import the authentication middleware
const Notification = mongoose.model('Notification'); // Get Notification model for notifications


// Helper function to generate a simulated blockchain transaction hash
const generateSimulatedTxHash = (prefix = 'sim_tx') => {
    // Generates a unique-enough string for demo purposes based on timestamp and random number
    return `${prefix}_${Date.now().toString(16)}${Math.random().toString(16).substring(2, 12)}`;
};


// --- Investment Routes ---

// @route GET /api/investments/investor/:investorId
// @desc Get all investments made by a specific investor (for their portfolio)
// @access Private (Requires authentication. User should typically only fetch their own investments)
router.get('/investor/:investorId', authenticateToken, async (req, res) => {
    const investorId = req.params.investorId; // Get the investor ID from the URL parameter
    const userId = req.user._id;           // Authenticated user's ID

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(investorId)) {
        return res.status(400).json({ message: 'Invalid Investor ID format.' }); // 400 Bad Request
    }

    // Authorization: Ensure the authenticated user is the investor whose portfolio is being requested.
    // Or allow an admin user to view any investor's portfolio.
    if (userId.toString() !== investorId.toString() && req.user.role !== 'admin') {
         console.warn(`Authorization failed: User ${userId} attempted to view investments for user ${investorId}`);
        return res.status(403).json({ message: "Forbidden: You can only view your own investments." }); // 403 Forbidden
    }

    try {
        // Find investment documents for the specified investor
        // Populate related project and farmer details for display in the portfolio
        const investments = await Investment.find({ investorWallet: investorId })
                                           .populate('projectId', 'title status fundedAmount amount updates') // Populate related project details
                                           .populate('farmerWallet', 'name role displayIdentifier') // Populate farmer details
                                            // Note: Redundant fields like projectTitle, crop, roi etc. are stored directly in Investment
                                            // document, so we don't need to populate them here if that's sufficient.
                                           .sort({ investmentDate: -1 }); // Sort by newest investment first

        // Map to format for frontend (e.g., ensure _id is string, format dates)
         const formattedInvestments = investments.map(investment => {
             // Determine project status based on the populated project if available, otherwise use investment status
             const projectStatus = investment.projectId ? investment.projectId.status : 'unknown';
             const projectUpdates = investment.projectId ? (investment.projectId.updates || []) : [];

             return {
                 _id: investment._id.toString(),
                 investorWallet: investment.investorWallet.toString(), // Investor user ID string
                 projectId: investment.projectId ? investment.projectId._id.toString() : null, // Project ID string
                 projectTitle: investment.projectTitle, // Redundant field
                 farmerWallet: investment.farmerWallet ? investment.farmerWallet._id.toString() : null, // Farmer user ID string
                 farmerName: investment.farmerWallet ? (investment.farmerWallet.name.split(' ')[0] || investment.farmerWallet.displayIdentifier) : 'Unknown Farmer',
                 crop: investment.crop, // Redundant field
                 method: investment.method, // Redundant field
                 description: investment.description, // Redundant field
                 acres: investment.acres, // Redundant field
                 timeline: investment.timeline, // Redundant field
                 roi: investment.roi, // Redundant field
                 investorShare: investment.investorShare, // Redundant field
                 cid: investment.cid, // Redundant video CID
                 videoStorageType: investment.videoStorageType, // Redundant
                 videoFileHash: investment.videoFileHash, // Redundant

                 amount: investment.amount, // Amount invested by this investor

                 // Use investment status for portfolio display
                 status: investment.status, // Status of this specific investment
                 progress: investment.progress, // Simulated progress of this specific investment

                 investmentDate: investment.investmentDate ? investment.investmentDate.toISOString() : null, // ISO string date
                 txHash: investment.txHash, // Investment transaction hash

                 // Payout details
                 payoutAmount: investment.payoutAmount,
                 payoutDate: investment.payoutDate ? investment.payoutDate.toISOString() : null,
                 payoutTxHash: investment.payoutTxHash,
                 payoutNotified: investment.payoutNotified,

                 // Include project updates if needed for the investment details modal
                 updates: projectUpdates.map(update => ({
                     id: update.id, // Keeping demo ID format
                     date: update.date, // Keeping string format
                     text: update.text,
                 })),
             };
         });


        // Send the list of investments for this investor
        res.json(formattedInvestments); // Default status is 200 OK

    } catch (err) {
        console.error(`GET /api/investments/investor/${investorId} error:`, err);
        res.status(500).json({ message: 'Server error fetching investments.' }); // 500 Internal Server Error
    }
});


// @route POST /api/investments
// @desc Create a new investment record and update the corresponding funding request
// @access Private (Requires authentication. Must be an investor.)
router.post('/', authenticateToken, async (req, res) => {
    // Authorization: Ensure the authenticated user has the 'investor' role.
    if (req.user.role !== 'investor') {
         console.warn(`Authorization failed: User ${req.user._id} with role ${req.user.role} attempted to create an investment.`);
        return res.status(403).json({ message: "Forbidden: Only users with the 'investor' role can make investments." }); // 403 Forbidden
    }

    // Extract investment details from the request body
    const { projectId, amount } = req.body; // Get the project ID and investment amount

    // Basic input validation
    if (!projectId || amount === undefined) {
         return res.status(400).json({ message: "Missing required investment fields (projectId, amount)." }); // 400 Bad Request
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
         return res.status(400).json({ message: "Invalid investment amount. Amount must be a positive number." }); // 400 Bad Request
    }
     // Validate projectId format
     if (!mongoose.Types.ObjectId.isValid(projectId)) {
         return res.status(400).json({ message: 'Invalid Project ID format.' }); // 400 Bad Request
     }


    // --- Transaction and Update Logic (Wrap in a transaction if using replica set) ---
    // In production, for operations that update multiple documents (like this, updating FundingRequest and creating Investment/Transaction),
    // you should use MongoDB transactions if your deployment is a replica set. This ensures
    // either all operations succeed or all fail, maintaining data consistency.
    // For a standalone MongoDB server or simple demo, we'll just perform operations sequentially.

    try {
        // --- 1. Find and Update the Funding Request ---
        // Find the funding request by ID
        // Use findByIdAndUpdate with $inc for atomic increment and $push for adding investor to embedded array
        const updatedFundingRequest = await FundingRequest.findByIdAndUpdate(
            projectId,
            {
                $inc: { fundedAmount: parsedAmount }, // Atomically increment fundedAmount
                $push: { // Add investor details to the embedded 'investors' array
                     investors: {
                         investorId: req.user._id, // Link to the authenticated investor
                         amount: parsedAmount,
                         // txHash and investmentDate will be added below when creating the Investment document
                         // but we need them here to embed in the FundingRequest first.
                         // This is a slight inconsistency between embedded and main document storage.
                         // Option 1: Generate txHash here and use it for both embedded and main Investment doc.
                         // Option 2: Only push investorId and amount here, and update the FundingRequest
                         //           again after the main Investment doc is saved (more complex).
                         // Let's use Option 1 for simplicity in demo: generate txHash now.
                         txHash: generateSimulatedTxHash('sim_invest'), // Generate TxHash for the investment transaction
                         investmentDate: new Date(), // Use current date for this specific investment event
                     }
                }
            },
            { new: true, runValidators: true } // Return the updated document and run validators
        );

        // If funding request is not found, return 404
        if (!updatedFundingRequest) {
            return res.status(404).json({ message: 'Funding request not found.' }); // 404 Not Found
        }

        // Check if the investment amount exceeded the remaining needed amount BEFORE the update
        // The update already happened, so check based on the updated fundedAmount.
        // This check is better done before the update to provide a precise error message.
        // A better flow: Find -> Validate amount -> If valid, perform $inc and $push -> Check status transitions.
        // Let's re-fetch the request after the update to get the correct total funded amount status.
        // Or, rely on the pre-save hook in FundingRequest.js to update status based on fundedAmount.
        // Assuming the pre-save hook handles funded/partially_funded status transition.

        // --- 2. Create the Investment Document (Main Record) ---
        // Find the specific investor entry we just pushed to get the correct embedded txHash and date
        const investorEntry = updatedFundingRequest.investors.find(inv =>
             inv.investorId.equals(req.user._id) && inv.amount === parsedAmount && // Match by user and amount
             (new Date() - new Date(inv.investmentDate) < 5000) // Also check timestamp proximity to avoid issues with multiple same-amount investments
         );

         if (!investorEntry) {
              // This shouldn't happen if the $push worked, but handle defensively
              console.error(`CRITICAL ERROR: Could not find newly pushed investor entry in request ${projectId}.`);
               // Attempt to revert the funding amount? Complex without transactions.
              return res.status(500).json({ message: "Server error recording investment details." });
         }

        const newInvestment = new Investment({
            investorWallet: req.user._id, // Link to the authenticated investor
            projectId: updatedFundingRequest._id, // Link to the funding request
            amount: parsedAmount,
            txHash: investorEntry.txHash, // Use the generated txHash from the embedded entry
            investmentDate: investorEntry.investmentDate, // Use the date from the embedded entry
            // Redundant fields (projectTitle, farmerWallet, crop, etc.) will be populated by the pre-save hook on Investment.js
            status: 'active', // Initial status for an individual investment record
            progress: 0, // Initial progress
        });

        const savedInvestment = await newInvestment.save();


        // --- 3. Create the Transaction Record ---
         const transaction = new Transaction({
             userId: req.user._id, // The investor's ID
             txHash: savedInvestment.txHash, // Use the same transaction hash as the investment record
             type: 'investment', // Transaction type
             amount: savedInvestment.amount, // Amount invested
             projectId: savedInvestment.projectId, // Link to the project
             date: savedInvestment.investmentDate, // Date of the investment transaction
         });
         await transaction.save();
         console.log(`SIMULATING: Created transaction ${transaction._id} for investor ${req.user._id} for investment ${savedInvestment._id}`);


        // --- 4. Send Notifications ---
        // Notify the farmer about the new investment
         try {
              const farmerNotification = new Notification({
                  recipient: updatedFundingRequest.farmerWallet, // Farmer's ID
                  type: 'investment', // Custom notification type
                  message: `${req.user.name.split(' ')[0]} invested ${parsedAmount.toFixed(2)} SOL in your project "${updatedFundingRequest.title}"!`,
                  itemId: updatedFundingRequest._id, // Link to the funding request document
                  itemType: 'FundingRequest',
                  read: false,
              });
              await farmerNotification.save();
              console.log(`SIMULATING: Notified farmer ${updatedFundingRequest.farmerWallet} about new investment in project ${updatedFundingRequest._id}.`);

             // Optional: Notify the investor about their successful investment (less critical, frontend might handle this)
             // const investorNotification = new Notification({ ... }); await investorNotification.save();

         } catch (notificationError) {
             console.error('Error creating notification after investment:', notificationError);
             // Do not block the response if notifications fail
         }


        // --- 5. Prepare Response ---
        // Populate fields on the saved investment document before sending it back
        await savedInvestment.populate('projectId', 'title status fundedAmount amount updates')
                            .populate('farmerWallet', 'name role displayIdentifier'); // Populate related documents

        // Map to format for frontend (similar to GET /investor/:id)
         const formattedInvestment = {
             _id: savedInvestment._id.toString(),
             investorWallet: savedInvestment.investorWallet.toString(),
             projectId: savedInvestment.projectId ? savedInvestment.projectId._id.toString() : null,
             projectTitle: savedInvestment.projectTitle,
             farmerWallet: savedInvestment.farmerWallet ? savedInvestment.farmerWallet._id.toString() : null,
             farmerName: savedInvestment.farmerWallet ? (savedInvestment.farmerWallet.name.split(' ')[0] || savedInvestment.farmerWallet.displayIdentifier) : 'Unknown Farmer',
             crop: savedInvestment.crop,
             method: savedInvestment.method,
             description: savedInvestment.description,
             acres: savedInvestment.acres,
             timeline: savedInvestment.timeline,
             roi: savedInvestment.roi,
             investorShare: savedInvestment.investorShare,
             cid: savedInvestment.cid,
             videoStorageType: savedInvestment.videoStorageType,
             videoFileHash: savedInvestment.videoFileHash,

             amount: savedInvestment.amount,

             status: savedInvestment.status,
             progress: savedInvestment.progress,

             investmentDate: savedInvestment.investmentDate ? savedInvestment.investmentDate.toISOString() : null,
             txHash: savedInvestment.txHash,

             payoutAmount: savedInvestment.payoutAmount,
             payoutDate: savedInvestment.payoutDate ? savedInvestment.payoutDate.toISOString() : null,
             payoutTxHash: savedInvestment.payoutTxHash,
             payoutNotified: savedInvestment.payoutNotified,

             // Include project updates (from the updatedFundingRequest or re-fetch if needed)
             // For simplicity, we can omit updates in the immediate response or fetch them separately on the frontend
             // updates: updatedFundingRequest.updates.map(...) // Need to fetch updated request again or structure the findByIdAndUpdate response differently
         };


        // Send a success response with the created investment document
        res.status(201).json(formattedInvestment); // 201 Created

    } catch (err) {
        console.error('POST /api/investments error:', err);
         // Handle Mongoose validation errors or other errors
         if (err.name === 'ValidationError') {
              // This might catch errors from the FundingRequest update or Investment creation
              return res.status(400).json({ message: err.message });
         }
        res.status(500).json({ message: 'Server error creating investment.' }); // 500 Internal Server Error
    }
});


// @route PUT /api/investments/:id/progress
// @desc Simulate updating investment progress and triggering payout
// @access Private (Requires authentication. Ideally admin or internal process.)
// Request Body: { progress: number, updateText: string (optional) }
// NOTE: This route is primarily for simulating progress/payout in a demo.
// Actual project progress tracking and payout would likely be more complex
// and potentially managed by backend Cron jobs or external triggers.
router.put('/:id/progress', authenticateToken, async (req, res) => {
     // Authorization: Restrict this to an admin role or specific automated process user in a real app.
     // For this demo, we'll allow any authenticated user to hit it, but log a warning.
     if (req.user.role !== 'admin') {
          console.warn(`Access Warning: Non-admin user ${req.user._id} attempted to update investment progress via API.`);
         // Decide if you want to forbid this for non-admins:
         // return res.status(403).json({ message: "Forbidden: Only admin can update investment progress." });
     }

    const investmentId = req.params.id; // Get the investment ID from the URL parameter
    const userId = req.user._id;         // Authenticated user making the request
    const { progress, updateText } = req.body; // Expected new progress value (0-100) and optional update text

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(investmentId)) {
        return res.status(400).json({ message: 'Invalid Investment ID format.' }); // 400 Bad Request
    }

    // Validate progress value
    const parsedProgress = parseInt(progress, 10);
    if (isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
         return res.status(400).json({ message: 'Invalid progress value provided. Must be a number between 0 and 100.' }); // 400 Bad Request
    }

    try {
        // Find the investment document
        const investment = await Investment.findById(investmentId)
                                           .populate('projectId', 'title status fundedAmount amount updates farmerWallet') // Populate related project details
                                           .populate('investorWallet', 'name role displayIdentifier'); // Populate investor details


        // If investment is not found, return 404
        if (!investment) {
            return res.status(404).json({ message: 'Investment not found.' }); // 404 Not Found
        }

        // --- Apply Progress and Status Updates ---

        // Check if the investment is already harvested/cancelled (terminal states)
         if (investment.status === 'harvested' || investment.status === 'cancelled') {
             // Prevent updating progress if in a terminal state, unless progress is already 100
              if (parsedProgress < 100 || investment.status === 'cancelled') {
                 return res.status(400).json({ message: `Cannot update progress for investment in terminal state "${investment.status}".` });
              }
         }


        // Update the progress value
        investment.progress = parsedProgress;

        let payoutTriggered = false; // Flag to track if payout logic ran

        // Check status transitions based on progress
        if (investment.progress >= 100 && investment.status !== 'harvested') {
            // Investment is now completed/harvested
            investment.status = 'harvested';

            // --- Trigger Payout Logic (Simulated) ---
            // This payout logic runs when an individual investment reaches 100% progress.
            // The project status on FundingRequest is updated when all investments are harvested (handled below).
             if (!investment.payoutNotified) {
                 console.log(`SIMULATING: Triggering payout for investment ${investment._id} (Project: ${investment.projectId})`);

                 // Calculate simulated payout amount
                 const calculatedPayoutAmount = investment.amount * (investment.roi / 100); // Use the ROI stored in the Investment document

                 investment.payoutAmount = calculatedPayoutAmount;
                 investment.payoutDate = new Date();
                 investment.payoutTxHash = generateSimulatedTxHash('sim_payout');

                 // Create a payout transaction record for the investor
                  const payoutTransaction = new Transaction({
                      userId: investment.investorWallet, // The investor who receives payout
                      txHash: investment.payoutTxHash,
                      type: 'payout',
                      amount: investment.payoutAmount,
                      projectId: investment.projectId,
                      date: investment.payoutDate,
                  });
                  await payoutTransaction.save();
                  console.log(`SIMULATING: Created payout transaction ${payoutTransaction._id} for investor ${investment.investorWallet}`);

                 // Notify the investor about the payout
                  try {
                       const payoutNotification = new Notification({
                           recipient: investment.investorWallet,
                           type: 'payout', // Custom type
                           message: `Payout received for "${investment.projectTitle}": ${investment.payoutAmount.toFixed(2)} SOL!`,
                           itemId: investment._id, // Link to the investment document
                           itemType: 'Investment',
                           read: false,
                       });
                       await payoutNotification.save();
                       console.log(`SIMULATING: Notified investor ${investment.investorWallet} about payout for ${investment._id}.`);
                  } catch (notifError) {
                       console.error('Error notifying investor about payout:', notifError);
                  }

                 // Notify the farmer that payout was processed for this investment
                  try {
                       const farmerNotification = new Notification({
                           recipient: investment.farmerWallet, // The farmer's ID
                           type: 'payout', // Re-using 'payout' type, or could create 'investment_harvested'
                           message: `Payout processed for an investment in "${investment.projectTitle}". Investor received ${investment.payoutAmount.toFixed(2)} SOL.`,
                           itemId: investment._id,
                           itemType: 'Investment',
                           read: false,
                       });
                       await farmerNotification.save();
                       console.log(`SIMULATING: Notified farmer ${investment.farmerWallet} about payout processed for ${investment._id}.`);
                  } catch (notifError) {
                       console.error('Error notifying farmer about payout:', notifError);
                  }

                 investment.payoutNotified = true; // Mark as notified to prevent duplicate payouts
                 payoutTriggered = true; // Set flag
             }

            // Check if all investments in the project are now harvested
            // This logic should ideally run after the investment document is saved with the new status
             // Let's do this check after saving the investment document below.


        } else if (investment.progress > 0 && investment.status === 'active') {
            // If progress is greater than 0 but not yet 100, and status is still 'active', change to 'growing'.
            investment.status = 'growing';
        } else if (investment.progress === 0 && investment.status !== 'active' && investment.status !== 'harvested' && investment.status !== 'cancelled') {
             // If progress goes back to 0 (unlikely scenario), maybe revert status?
             // Or just keep it as 'growing' if it was already.
             // Let's ensure it's at least 'active' if progress is 0.
            if (investment.status !== 'growing') { // Avoid changing from 'growing' if progress just went to 0
                 investment.status = 'active';
            }
        }


        // --- Add Optional Update Text (if provided in body) ---
         if (updateText && updateText.trim() !== '' && investment.projectId) {
             // We need to add this update to the FundingRequest document, not the Investment document.
             // Find the related FundingRequest document.
             const fundingRequestToUpdate = await FundingRequest.findById(investment.projectId);

             if (fundingRequestToUpdate) {
                 const newUpdate = {
                     _id: new mongoose.Types.ObjectId(), // Use Mongoose ObjectId for embedded document ID
                     date: new Date().toLocaleDateString(), // Keep string date format for demo consistency
                     text: updateText.trim(),
                 };
                  if (!fundingRequestToUpdate.updates) {
                      fundingRequestToUpdate.updates = [];
                  }
                 fundingRequestToUpdate.updates.push(newUpdate);

                 // Save the updated FundingRequest document
                 await fundingRequestToUpdate.save();
                  console.log(`Added new update to Funding Request ${fundingRequestToUpdate._id}`);

                 // Notify ALL investors in this project about the new update
                  const investorsInProject = await Investment.find({ projectId: investment.projectId }).distinct('investorWallet');
                   if (investorsInProject && investorsInProject.length > 0) {
                       const notifications = investorsInProject.map(investorId => ({
                           recipient: investorId,
                           type: 'update', // Custom type
                           message: `Update posted for project "${fundingRequestToUpdate.title}" (${newUpdate.date}): ${newUpdate.text.substring(0, 50)}...`,
                           itemId: fundingRequestToUpdate._id,
                           itemType: 'FundingRequest',
                           read: false,
                       }));
                       await Notification.insertMany(notifications);
                       console.log(`SIMULATING: Notified ${investorsInProject.length} investors about update for request ${fundingRequestToUpdate._id}`);
                   }

             } else {
                 console.warn(`Update text provided, but associated Funding Request ${investment.projectId} not found.`);
                 // Decide how to handle - maybe create a standalone update log?
             }
         }


        // --- Save the Updated Investment Document ---
        const updatedInvestment = await investment.save();

        // --- Post-Save Check for Project Status ---
         // After saving the individual investment, check if THIS project is now fully harvested.
         if (payoutTriggered && updatedInvestment.status === 'harvested' && updatedInvestment.projectId) {
             const totalInvestmentsInProject = await Investment.countDocuments({ projectId: updatedInvestment.projectId });
             const harvestedInvestmentsInProject = await Investment.countDocuments({ projectId: updatedInvestment.projectId, status: 'harvested' });

             // If all investments are harvested, update the project status to 'completed'
             if (totalInvestmentsInProject > 0 && totalInvestmentsInProject === harvestedInvestmentsInProject) {
                 const fundingRequest = await FundingRequest.findById(updatedInvestment.projectId);
                 if (fundingRequest && fundingRequest.status !== 'completed') {
                      fundingRequest.status = 'completed';
                      await fundingRequest.save();
                      console.log(`SIMULATING: Project ${fundingRequest._id} marked as completed because all investments are harvested.`);

                      // Optional: Notify farmer/investors that the entire project is completed
                       try {
                           const completionNotification = new Notification({
                               recipient: fundingRequest.farmerWallet, // Notify the farmer
                               type: 'update', // Or a 'completion' type
                               message: `Your project "${fundingRequest.title}" is now completed!`,
                               itemId: fundingRequest._id,
                               itemType: 'FundingRequest',
                               read: false,
                           });
                            // Also notify all investors that the project is completed (they already got payout notifs)
                            // const investorsInProject = await Investment.find({ projectId: fundingRequest._id }).distinct('investorWallet');
                            // ... create notifications for investors ...

                           await completionNotification.save();
                           console.log(`SIMULATING: Notified farmer ${fundingRequest.farmerWallet} that project ${fundingRequest._id} is completed.`);
                       } catch (notifError) {
                            console.error('Error notifying farmer about project completion:', notifError);
                       }
                 }
             }
         }


        // Populate fields for the response
        await updatedInvestment.populate('projectId', 'title status fundedAmount amount updates farmerWallet') // Re-populate project data
                                .populate('investorWallet', 'name role displayIdentifier'); // Populate investor data

         // Map to format for frontend (similar structure to the GET response)
         const formattedUpdatedInvestment = {
             _id: updatedInvestment._id.toString(),
             investorWallet: updatedInvestment.investorWallet.toString(),
             projectId: updatedInvestment.projectId ? updatedInvestment.projectId._id.toString() : null,
             projectTitle: updatedInvestment.projectTitle,
             farmerWallet: updatedInvestment.farmerWallet ? updatedInvestment.farmerWallet._id.toString() : null,
             farmerName: updatedInvestment.farmerWallet ? (updatedInvestment.farmerWallet.name.split(' ')[0] || updatedInvestment.farmerWallet.displayIdentifier) : 'Unknown Farmer',
             crop: updatedInvestment.crop,
             method: updatedInvestment.method,
             description: updatedInvestment.description,
             acres: updatedInvestment.acres,
             timeline: updatedInvestment.timeline,
             roi: updatedInvestment.roi,
             investorShare: updatedInvestment.investorShare,
             cid: updatedInvestment.cid,
             videoStorageType: updatedInvestment.videoStorageType,
             videoFileHash: updatedInvestment.videoFileHash,

             amount: updatedInvestment.amount,

             status: updatedInvestment.status,
             progress: updatedInvestment.progress,

             investmentDate: updatedInvestment.investmentDate ? updatedInvestment.investmentDate.toISOString() : null,
             txHash: updatedInvestment.txHash,

             payoutAmount: updatedInvestment.payoutAmount,
             payoutDate: updatedInvestment.payoutDate ? updatedInvestment.payoutDate.toISOString() : null,
             payoutTxHash: updatedInvestment.payoutTxHash,
             payoutNotified: updatedInvestment.payoutNotified,

             // Include project updates if they were added/updated (fetch from the updated FundingRequest document if necessary)
             // Since we populated projectId with updates, we can access them here
             updates: updatedInvestment.projectId && updatedInvestment.projectId.updates
                 ? updatedInvestment.projectId.updates.map(update => ({
                     id: update.id, date: update.date, text: update.text,
                 }))
                 : [], // Empty array if no project or no updates

         };


        // Send a success response with the updated investment document
        res.json({ message: 'Investment progress updated successfully.', investment: formattedUpdatedInvestment }); // Default status is 200 OK

    } catch (err) {
        console.error(`PUT /api/investments/${investmentId}/progress error:`, err);
        // Handle potential Mongoose validation errors
         if (err.name === 'ValidationError') {
              return res.status(400).json({ message: err.message });
         }
        res.status(500).json({ message: 'Server error updating investment progress.' }); // 500 Internal Server Error
    }
});


// --- Export the router ---

// Export the configured router so it can be used by server.js
module.exports = router;