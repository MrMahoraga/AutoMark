const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  teacherId: { type: String, required: true, unique: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema);