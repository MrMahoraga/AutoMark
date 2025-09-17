const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], required: true },
  timestamp: { type: Date, default: Date.now }, // Time of marking
  method: { type: String, enum: ['manual', 'facial'], default: 'manual' }, // How attendance was marked
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);