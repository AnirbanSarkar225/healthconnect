const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['cardiac', 'respiratory', 'trauma', 'fall', 'glucose', 'manual', 'other'],
    required: true
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'high' },
  triggeredBy: { type: String, enum: ['auto', 'manual'], default: 'manual' },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  vitalsAtAlert: { type: Object },
  emergencyContactNotified: { type: Boolean, default: false },
  servicesNotified: [{ type: String }],
  resolvedAt: { type: Date },
  status: { type: String, enum: ['active', 'responded', 'resolved', 'false-alarm'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);
