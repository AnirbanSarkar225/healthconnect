const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'healthconnect_secret', { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, phone, dateOfBirth, bloodGroup, emergencyContact } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'fullName, email, password and phone are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone,
      dateOfBirth: dateOfBirth || undefined,
      bloodGroup: bloodGroup || 'Unknown',
      emergencyContact: emergencyContact || {}
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'healthconnect_secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'healthconnect_secret');
    const { fullName, phone, dateOfBirth, bloodGroup, weight, emergencyContact, medicalHistory, allergies, currentMedications } = req.body;

    const updated = await User.findByIdAndUpdate(
      decoded.id,
      { fullName, phone, dateOfBirth, bloodGroup, weight, emergencyContact, medicalHistory, allergies, currentMedications },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
