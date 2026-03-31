const express = require('express');
const router = express.Router();
const EmergencyAlert = require('../models/EmergencyAlert');
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

router.post('/alert', auth, async (req, res) => {
  try {
    const { type, severity, triggeredBy, location, vitalsAtAlert } = req.body;

    const alert = await EmergencyAlert.create({
      userId: req.user.id,
      type: type || 'manual',
      severity: severity || 'high',
      triggeredBy: triggeredBy || 'manual',
      location: location || {},
      vitalsAtAlert: vitalsAtAlert || {},
      servicesNotified: ['ambulance', 'emergency_contact', 'on_call_doctor']
    });

    console.log(`🚨 EMERGENCY ALERT — userId: ${req.user.id}, type: ${alert.type}`);

    res.status(201).json({
      success: true,
      alert,
      message: 'Emergency services have been notified. Help is on the way.',
      contactNumbers: { ambulance: '108', emergency: '112', police: '100', healthConnect: '1800-HC-HELP' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const alert = await EmergencyAlert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'resolved', resolvedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
