const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AvatarMessage = mongoose.model('AvatarMessage');
const { authenticateToken } = require('./auth');

// @route GET /api/avatarmessages
// @desc Get all avatar messages for the authenticated user.
// @access Private
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user._id;
  try {
    const messages = await AvatarMessage.find({ userId }).sort({ timestamp: -1 });
    res.json(messages);
  } catch (err) {
    console.error('GET /api/avatarmessages error:', err);
    res.status(500).json({ message: 'Server error fetching avatar messages.' });
  }
});

// @route POST /api/avatarmessages
// @desc Create a new avatar message for the authenticated user.
// @access Private
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user._id;
  const { text, sender } = req.body;
  if (!text || !sender) {
    return res.status(400).json({ message: 'Missing required fields: text and sender.' });
  }
  try {
    const newMessage = new AvatarMessage({
      userId,
      text,
      sender,
      timestamp: new Date(),
      readByUser: false
    });
    const savedMessage = await newMessage.save();
    res.status(201).json(savedMessage);
  } catch (err) {
    console.error('POST /api/avatarmessages error:', err);
    res.status(500).json({ message: 'Server error creating avatar message.' });
  }
});

module.exports = router; 