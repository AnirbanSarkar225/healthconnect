const express = require('express');
const router = express.Router();
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

const Appointment = require('../models/Appointment');

const DOCTORS_LIST = [
  { id: 'd1', name: 'Dr. Priya Sharma', specialty: 'General Medicine', rating: 4.9, available: true, emoji: '👩‍⚕️', exp: '12 yrs' },
  { id: 'd2', name: 'Dr. Arjun Mehta', specialty: 'Cardiology', rating: 4.8, available: true, emoji: '👨‍⚕️', exp: '15 yrs' },
  { id: 'd3', name: 'Dr. Sunita Rao', specialty: 'Neurology', rating: 4.7, available: true, emoji: '👩‍⚕️', exp: '10 yrs' },
  { id: 'd4', name: 'Dr. Vikram Patel', specialty: 'Orthopedics', rating: 4.9, available: false, emoji: '👨‍⚕️', exp: '18 yrs' },
  { id: 'd5', name: 'Dr. Meera Nair', specialty: 'Pediatrics', rating: 4.8, available: true, emoji: '👩‍⚕️', exp: '8 yrs' },
  { id: 'd6', name: 'Dr. Rajesh Kumar', specialty: 'Dermatology', rating: 4.6, available: true, emoji: '👨‍⚕️', exp: '11 yrs' },
];

router.get('/doctors', (req, res) => {
  res.json({ success: true, doctors: DOCTORS_LIST });
});

router.post('/', auth, async (req, res) => {
  try {
    const { specialty, type, scheduledAt, doctorName, symptoms } = req.body;
    if (!specialty || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'specialty and scheduledAt are required' });
    }

    const appt = await Appointment.create({
      patient: req.user.id,
      specialty,
      type: type || 'video',
      scheduledAt: new Date(scheduledAt),
      doctorName: doctorName || 'Next available doctor',
      symptoms: symptoms || ''
    });

    res.status(201).json({ success: true, appointment: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const appts = await Appointment.find({ patient: req.user.id }).sort({ scheduledAt: -1 });
    res.json({ success: true, appointments: appts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const appt = await Appointment.findOneAndUpdate(
      { _id: req.params.id, patient: req.user.id },
      { status: 'cancelled' },
      { new: true }
    );
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, appointment: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
