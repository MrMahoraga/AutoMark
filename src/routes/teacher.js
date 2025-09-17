const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateTeacherId } = require('../utils/idGenerator');
const { sendTeacherIdEmail } = require('../utils/mailer');
const { body, validationResult } = require('express-validator');

// Register teacher
router.post('/register', 
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('schoolId').notEmpty(),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password, schoolId } = req.body;

    const school = await School.findOne({ schoolId });
    if (!school) return res.status(400).json({ message: 'Invalid school ID' });

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) return res.status(400).json({ message: 'Email already registered' });

    const existingTeachers = await Teacher.find({ school: school._id }).sort({ teacherId: -1 }).limit(1);
    let nextNumber = 1;
    if (existingTeachers.length > 0) {
      const lastTeacherId = existingTeachers[0].teacherId;
      const parts = lastTeacherId.split('-');
      if (parts.length === 2) {
        const lastNumber = parseInt(parts[1], 10);
        nextNumber = lastNumber + 1;
      }
    }
    const teacherId = generateTeacherId(school.schoolId, nextNumber);

    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = new Teacher({
      name,
      email,
      passwordHash: hashedPassword,
      teacherId,
      school: school._id,
    });

    await teacher.save();

    // Send teacherId email
    sendTeacherIdEmail(email, teacherId).catch(err => {
      console.error('Failed to send teacher ID email:', err);
    });

    res.status(201).json({ message: 'Teacher registered', teacherId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login teacher
router.post('/login', 
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const teacher = await Teacher.findOne({ email });
    if (!teacher) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, teacher.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = {
      id: teacher._id,
      role: 'teacher',
      teacherId: teacher.teacherId,
      schoolId: teacher.school.toString(),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;