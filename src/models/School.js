const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  schoolId: { type: String, required: true, unique: true }, // e.g. first 3 letters uppercase
  address: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('School', SchoolSchema);