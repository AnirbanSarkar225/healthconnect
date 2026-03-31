const mongoose = require('mongoose');

const healthDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  vitals: {
    heartRate: { type: Number },
    bloodPressureSystolic: { type: Number },
    bloodPressureDiastolic: { type: Number },
    oxygenSaturation: { type: Number },
    temperature: { type: Number },
    respiratoryRate: { type: Number },
    bloodGlucose: { type: Number },
    weight: { type: Number },
    bmi: { type: Number }
  },
  status: {
    type: String,
    enum: ['normal', 'warning', 'critical'],
    default: 'normal'
  },
  alerts: [{ type: String }],
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  }
});

healthDataSchema.pre('save', function(next) {
  const v = this.vitals;
  const alerts = [];

  if (v.heartRate && (v.heartRate < 40 || v.heartRate > 140)) alerts.push('Abnormal heart rate detected');
  if (v.oxygenSaturation && v.oxygenSaturation < 90) alerts.push('Critical oxygen saturation');
  if (v.bloodPressureSystolic && (v.bloodPressureSystolic > 180 || v.bloodPressureSystolic < 80)) alerts.push('Critical blood pressure');
  if (v.temperature && (v.temperature > 40 || v.temperature < 35)) alerts.push('Abnormal body temperature');
  if (v.bloodGlucose && (v.bloodGlucose > 400 || v.bloodGlucose < 50)) alerts.push('Critical blood glucose');

  this.alerts = alerts;
  this.status = alerts.length > 2 ? 'critical' : alerts.length > 0 ? 'warning' : 'normal';
  next();
});

module.exports = mongoose.model('HealthData', healthDataSchema);
