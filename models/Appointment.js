const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorName: { type: String },
  specialty: { type: String, required: true },
  type: { type: String, enum: ['video', 'chat', 'in-person'], default: 'video' },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, default: 30 }, // minutes
  status: { type: String, enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled'], default: 'pending' },
  symptoms: { type: String },
  notes: { type: String },
  prescription: { type: String },
  meetingLink: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
