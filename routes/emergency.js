const express = require('express');
const router = express.Router();
const EmergencyAlert = require('../models/EmergencyAlert');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'healthconnect_secret');
    next();
  } catch { res.status(401).json({ success: false, message: 'Invalid token' }); }
};

// POST /api/emergency/alert - Trigger emergency
router.post('/alert', auth, async (req, res) => {
  try {
    const alert = await EmergencyAlert.create({
      userId: req.user.id,
      ...req.body,
      servicesNotified: ['ambulance', 'emergency_contact', 'on_call_doctor']
    });

    // In production: trigger SMS via Twilio, push notifications, etc.
    console.log(`🚨 EMERGENCY ALERT for user ${req.user.id}: ${alert.type}`);

    res.status(201).json({
      success: true,
      alert,
      message: 'Emergency services have been notified. Help is on the way.',
      contactNumbers: {
        ambulance: '108',
        emergency: '112',
        policeHelpline: '100',
        healthConnect: '1800-HEALTH'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/emergency/history
router.get('/history', auth, async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/emergency/:id/resolve
router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const alert = await EmergencyAlert.findByIdAndUpdate(req.params.id, { status: 'resolved', resolvedAt: new Date() }, { new: true });
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
