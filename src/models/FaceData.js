const mongoose = require('mongoose');

const FaceDataSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  descriptors: [{ type: [Number] }], // Array of face descriptors
  photoUrl: { type: String }, // URL to stored photo
}, { timestamps: true });

module.exports = mongoose.model('FaceData', FaceDataSchema);
