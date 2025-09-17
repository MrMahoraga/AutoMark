const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Register student
router.post('/register', 
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('teacherId').notEmpty(),
  body('parentEmail').isEmail(),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, password, teacherId, parentEmail } = req.body;

    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) return res.status(400).json({ message: 'Invalid teacher ID' });

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = new Student({
      name,
      email,
      passwordHash: hashedPassword,
      teacher: teacher._id,
      school: teacher.school,
      parentEmail,
    });

    await student.save();

    res.status(201).json({ message: 'Student registered' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login student
router.post('/login', 
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, student.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = {
      id: student._id,
      role: 'student',
      schoolId: student.school.toString(),
      teacherId: student.teacher.toString(),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get students for a teacher
router.get('/', auth(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const students = await Student.find({ teacher: teacherId }).select('_id name email studentId');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
