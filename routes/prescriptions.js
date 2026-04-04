const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'healthconnect_secret');
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Prescription schema
const prescriptionSchema = new mongoose.Schema({
  patient:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor:     { type: String, required: true },
  diagnosis:  { type: String, required: true },
  medications: [{
    name:         { type: String, required: true },
    dosage:       { type: String },
    frequency:    { type: String },
    duration:     { type: String },
    instructions: { type: String }
  }],
  notes:     { type: String },
  status:    { type: String, enum: ['active', 'completed', 'revoked'], default: 'active' },
  issuedAt:  { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

const Prescription = mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema);

// GET /api/prescriptions
router.get('/', auth, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.user.id }).sort({ issuedAt: -1 });
    res.json({ success: true, prescriptions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/prescriptions (for doctors/admin to issue — simplified)
router.post('/', auth, async (req, res) => {
  try {
    const { doctor, diagnosis, medications, notes, expiresAt } = req.body;
    if (!doctor || !diagnosis || !medications?.length) {
      return res.status(400).json({ success: false, message: 'doctor, diagnosis and medications are required' });
    }
    const rx = await Prescription.create({
      patient: req.user.id, doctor, diagnosis, medications, notes, expiresAt
    });
    res.status(201).json({ success: true, prescription: rx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
