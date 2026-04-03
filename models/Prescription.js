const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  doctor:        { type: String, required: true },
  doctorId:      { type: String, default: '' },
  patient:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  diagnosis:     { type: String, required: true },
  medications: [{
    name:         { type: String, required: true },
    dosage:       { type: String, default: '' },
    frequency:    { type: String, default: 'Once daily' },
    duration:     { type: String, default: '7 days' },
    instructions: { type: String, default: '' }
  }],
  notes:    { type: String, default: '' },
  issuedAt: { type: Date, default: Date.now },
  expiresAt:{ type: Date },
  status:   { type: String, enum: ['active','expired','revoked'], default: 'active' }
});

prescriptionSchema.pre('save', function(next) {
  if (!this.expiresAt) this.expiresAt = new Date(Date.now() + 30*24*60*60*1000);
  next();
});

module.exports = mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema);
