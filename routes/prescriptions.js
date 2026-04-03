const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const Prescription = require('../models/Prescription');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'healthconnect_secret');
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// POST  /api/prescriptions  — doctor or admin issues a prescription
router.post('/', auth, async (req, res) => {
  try {
    const { patientId, diagnosis, medications, notes, doctor, appointmentId } = req.body;
    if (!patientId || !diagnosis || !medications?.length) {
      return res.status(400).json({ success: false, message: 'patientId, diagnosis and medications are required' });
    }
    const rx = await Prescription.create({
      doctor:        doctor || req.user.fullName || 'Doctor',
      doctorId:      req.user.id,
      patient:       patientId,
      appointmentId: appointmentId || null,
      diagnosis,
      medications,
      notes: notes || ''
    });
    res.status(201).json({ success: true, prescription: rx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/prescriptions  — patient sees own; doctor sees ones they issued
router.get('/', auth, async (req, res) => {
  try {
    const filter = req.query.patientId
      ? { patient: req.query.patientId }
      : { patient: req.user.id };
    const rxs = await Prescription.find(filter).sort({ issuedAt: -1 });
    res.json({ success: true, prescriptions: rxs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/prescriptions/:id  — single prescription
router.get('/:id', auth, async (req, res) => {
  try {
    const rx = await Prescription.findById(req.params.id);
    if (!rx) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, prescription: rx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/prescriptions/:id/revoke  — revoke
router.put('/:id/revoke', auth, async (req, res) => {
  try {
    const rx = await Prescription.findByIdAndUpdate(
      req.params.id,
      { status: 'revoked' },
      { new: true }
    );
    if (!rx) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, prescription: rx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
