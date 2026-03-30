const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'healthconnect_secret');
    next();
  } catch { res.status(401).json({ success: false, message: 'Invalid token' }); }
};

const SAMPLE_DOCTORS = [
  { id: 'd1', name: 'Dr. Priya Sharma', specialty: 'General Medicine', rating: 4.9, available: true, image: '👩‍⚕️' },
  { id: 'd2', name: 'Dr. Arjun Mehta', specialty: 'Cardiology', rating: 4.8, available: true, image: '👨‍⚕️' },
  { id: 'd3', name: 'Dr. Sunita Rao', specialty: 'Neurology', rating: 4.7, available: true, image: '👩‍⚕️' },
  { id: 'd4', name: 'Dr. Vikram Patel', specialty: 'Orthopedics', rating: 4.9, available: false, image: '👨‍⚕️' },
  { id: 'd5', name: 'Dr. Meera Nair', specialty: 'Pediatrics', rating: 4.8, available: true, image: '👩‍⚕️' },
  { id: 'd6', name: 'Dr. Rajesh Kumar', specialty: 'Dermatology', rating: 4.6, available: true, image: '👨‍⚕️' },
];

// GET /api/appointments/doctors
router.get('/doctors', (req, res) => {
  res.json({ success: true, doctors: SAMPLE_DOCTORS });
});

// POST /api/appointments - Book appointment
router.post('/', auth, async (req, res) => {
  try {
    const appt = await Appointment.create({ patient: req.user.id, ...req.body });
    res.status(201).json({ success: true, appointment: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/appointments - Get user appointments
router.get('/', auth, async (req, res) => {
  try {
    const appts = await Appointment.find({ patient: req.user.id }).sort({ scheduledAt: -1 });
    res.json({ success: true, appointments: appts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id/cancel
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    res.json({ success: true, appointment: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
