const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'healthconnect_secret');
    next();
  } catch { res.status(401).json({ success: false, message: 'Invalid token' }); }
};

// Simple message schema inline
const msgSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fromRole: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  text: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.models.Message || mongoose.model('Message', msgSchema);

// POST /api/chat/send
router.post('/send', auth, async (req, res) => {
  try {
    const { to, text } = req.body;
    const msg = await Message.create({ from: req.user.id, to, text });
    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/chat/messages/:userId
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const msgs = await Message.find({
      $or: [
        { from: req.user.id, to: req.params.userId },
        { from: req.params.userId, to: req.user.id }
      ]
    }).sort({ createdAt: 1 }).limit(100);
    res.json({ success: true, messages: msgs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/chat/conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const msgs = await Message.find({
      $or: [{ from: req.user.id }, { to: req.user.id }]
    }).sort({ createdAt: -1 });
    res.json({ success: true, messages: msgs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
