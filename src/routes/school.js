const express = require('express');
const router = express.Router();
const School = require('../models/School');
const { generateSchoolId } = require('../utils/idGenerator');
const { body, validationResult } = require('express-validator');

router.get('/', async (req, res) => {
  try {
    const schools = await School.find({});
    res.json(schools);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/register',
  body('name').notEmpty().withMessage('School name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, address } = req.body;
    const schoolId = generateSchoolId(name);

    const existing = await School.findOne({ $or: [{ name }, { schoolId }] });
    if (existing) {
      return res.status(200).json({
        message: 'School already exists',
        school: existing,
        schoolId: existing.schoolId,
        isExisting: true
      });
    }

    const school = new School({ name, schoolId, address });
    await school.save();

    res.status(201).json({ message: 'School registered', school, schoolId: school.schoolId, isExisting: false });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
