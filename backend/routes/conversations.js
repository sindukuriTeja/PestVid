const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Conversation = mongoose.model('Conversation');
const { authenticateToken } = require('./auth');

// @route GET /api/conversations
// @desc Get all conversations for the authenticated user.
// @access Private
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user._id;
  try {
    const conversations = await Conversation.find({ participants: userId }).sort({ lastMessageTimestamp: -1 });
    res.json(conversations);
  } catch (err) {
    console.error('GET /api/conversations error:', err);
    res.status(500).json({ message: 'Server error fetching conversations.' });
  }
});

// @route POST /api/conversations
// @desc Create a new conversation or return an existing one between the authenticated user and a target user.
// @access Private
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user._id;
  const { targetUserId } = req.body;
  if (!targetUserId) {
    return res.status(400).json({ message: 'Missing targetUserId in request body.' });
  }
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    return res.status(400).json({ message: 'Invalid target User ID format.' });
  }
  if (userId.toString() === targetUserId.toString()) {
    return res.status(400).json({ message: 'Cannot create a conversation with yourself.' });
  }
  try {
    const participantsSorted = [userId.toString(), targetUserId.toString()].sort();
    let conversation = await Conversation.findOne({
      participants: {
        $size: 2,
        $all: participantsSorted
      }
    });
    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, mongoose.Types.ObjectId(targetUserId)],
        lastMessageSnippet: 'Conversation started.',
        lastMessageTimestamp: new Date(),
        createdAt: new Date()
      });
      const savedConversation = await conversation.save();
      res.status(201).json(savedConversation);
    } else {
      res.json(conversation);
    }
  } catch (err) {
    console.error('POST /api/conversations error:', err);
    res.status(500).json({ message: 'Server error creating or getting conversation.' });
  }
});

module.exports = router; 