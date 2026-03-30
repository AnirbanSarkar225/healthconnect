const express = require('express');
const router = express.Router();
const HealthData = require('../models/HealthData');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'healthconnect_secret');
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// POST /api/health/vitals
router.post('/vitals', auth, async (req, res) => {
  try {
    const { vitals, location } = req.body;
    if (!vitals || typeof vitals !== 'object') {
      return res.status(400).json({ success: false, message: 'vitals object is required' });
    }
    const data = await HealthData.create({ userId: req.user.id, vitals, location });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/health/vitals — last 50 readings
router.get('/vitals', auth, async (req, res) => {
  try {
    const data = await HealthData.find({ userId: req.user.id }).sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/health/latest
router.get('/latest', auth, async (req, res) => {
  try {
    const data = await HealthData.findOne({ userId: req.user.id }).sort({ timestamp: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/health/summary — 7-day
router.get('/summary', auth, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const data = await HealthData.find({
      userId: req.user.id,
      timestamp: { $gte: sevenDaysAgo }
    }).sort({ timestamp: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
