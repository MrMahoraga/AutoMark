const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const auth = require('../middleware/auth');
const { sendAbsenceNotification } = require('../utils/mailer');
const { body, validationResult } = require('express-validator');

// Teacher marks attendance for a student
router.post('/mark',
  auth(['teacher']),
  body('studentId').notEmpty(),
  body('date').isISO8601(),
  body('status').isIn(['present', 'absent', 'late']),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { studentId, date, status } = req.body;
    const teacherId = req.user.id;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: 'Not authorized to mark attendance for this student' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0,0,0,0);

    let attendance = await Attendance.findOne({ student: studentId, date: attendanceDate });

    if (attendance) {
      attendance.status = status;
      await attendance.save();
    } else {
      attendance = new Attendance({ student: studentId, date: attendanceDate, status });
      await attendance.save();
    }

    // Send notification if absent
    if (status === 'absent') {
      await sendAbsenceNotification(student.parentEmail, student.parentPhone, student.name, attendanceDate);
    }

    res.json({ message: 'Attendance recorded' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Student views own attendance
router.get('/me', auth(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const records = await Attendance.find({ student: studentId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Teacher views attendance of their students
router.get('/teacher', auth(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const students = await Student.find({ teacher: teacherId }).select('_id name email');

    const studentIds = students.map(s => s._id);

    const attendanceRecords = await Attendance.find({ student: { $in: studentIds } })
      .populate('student', 'name email')
      .sort({ date: -1 });

    res.json({ students, attendanceRecords });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Bulk mark attendance for multiple students
router.post('/mark-bulk',
  auth(['teacher']),
  body('date').isISO8601(),
  body('attendance').isArray(),
  body('attendance.*.studentId').notEmpty(),
  body('attendance.*.status').isIn(['present', 'absent', 'late', 'excused']),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { date, attendance } = req.body;
    const teacherId = req.user.id;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0,0,0,0);

    const results = [];

    for (const record of attendance) {
      const { studentId, status } = record;

      const student = await Student.findById(studentId);
      if (!student) {
        results.push({ studentId, error: 'Student not found' });
        continue;
      }
      if (student.teacher.toString() !== teacherId) {
        results.push({ studentId, error: 'Not authorized to mark attendance for this student' });
        continue;
      }

      let attendanceRecord = await Attendance.findOne({ student: studentId, date: attendanceDate });

      if (attendanceRecord) {
        attendanceRecord.status = status;
        await attendanceRecord.save();
      } else {
        attendanceRecord = new Attendance({ student: studentId, date: attendanceDate, status });
        await attendanceRecord.save();
      }

      // Send notification if absent
      if (status === 'absent') {
        await sendAbsenceNotification(student.parentEmail, student.parentPhone, student.name, attendanceDate);
      }

      results.push({ studentId, status: 'success' });
    }

    res.json({ message: 'Bulk attendance recorded', results });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get attendance reports with filters
router.get('/report', auth(['teacher', 'admin']), async (req, res) => {
  try {
    const { studentId, fromDate, toDate, class: classFilter } = req.query;
    let query = {};

    if (studentId) {
      query.student = studentId;
    }

    if (fromDate && toDate) {
      query.date = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    } else if (fromDate) {
      query.date = { $gte: new Date(fromDate) };
    } else if (toDate) {
      query.date = { $lte: new Date(toDate) };
    }

    // If teacher, only show their students' attendance
    if (req.user.role === 'teacher') {
      const students = await Student.find({ teacher: req.user.id }).select('_id');
      const studentIds = students.map(s => s._id);
      query.student = { $in: studentIds };
    }

    const records = await Attendance.find(query)
      .populate('student', 'name email studentId')
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Facial recognition attendance marking
router.post('/facial-mark',
  auth(['teacher']),
  body('descriptors').isArray(),
  body('latitude').isFloat(),
  body('longitude').isFloat(),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { descriptors, latitude, longitude } = req.body;
    const teacherId = req.user.id;

    // Find school location for geolocation validation
    const teacher = await require('../models/Teacher').findById(teacherId).populate('school');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const schoolLocation = teacher.school.location;
    const distance = calculateDistance(latitude, longitude, schoolLocation.latitude, schoolLocation.longitude);

    if (distance > 500) { // 500 meters radius
      return res.status(403).json({ message: 'Attendance can only be marked within school premises' });
    }

    // Find matching student by face descriptors
    const students = await Student.find({ teacher: teacherId });
    let matchedStudent = null;
    let bestMatchDistance = Infinity;

    for (const student of students) {
      const faceData = await require('../models/FaceData').findOne({ student: student._id });
      if (!faceData || !faceData.descriptors.length) continue;

      for (const storedDescriptor of faceData.descriptors) {
        const distance = euclideanDistance(descriptors[0], storedDescriptor);
        if (distance < 0.6 && distance < bestMatchDistance) { // Threshold for match
          bestMatchDistance = distance;
          matchedStudent = student;
        }
      }
    }

    if (!matchedStudent) {
      return res.status(404).json({ message: 'No matching student found' });
    }

    // Mark attendance
    const today = new Date();
    today.setHours(0,0,0,0);

    let attendance = await Attendance.findOne({ student: matchedStudent._id, date: today });

    if (attendance) {
      attendance.status = 'present';
      attendance.method = 'facial';
      attendance.location = { latitude, longitude };
      attendance.timestamp = new Date();
      await attendance.save();
    } else {
      attendance = new Attendance({
        student: matchedStudent._id,
        date: today,
        status: 'present',
        method: 'facial',
        location: { latitude, longitude },
        timestamp: new Date()
      });
      await attendance.save();
    }

    res.json({ message: 'Facial attendance recorded', student: matchedStudent.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Distance in meters
}

// Upload face data for a student
router.post('/upload-face',
  auth(['teacher']),
  body('studentId').notEmpty(),
  body('descriptors').isArray(),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { studentId, descriptors } = req.body;
    const teacherId = req.user.id;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: 'Not authorized to manage this student' });
    }

    let faceData = await require('../models/FaceData').findOne({ student: studentId });

    if (faceData) {
      faceData.descriptors = descriptors;
      await faceData.save();
    } else {
      faceData = new (require('../models/FaceData'))({ student: studentId, descriptors });
      await faceData.save();
    }

    res.json({ message: 'Face data uploaded successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Helper function to calculate euclidean distance between descriptors
function euclideanDistance(desc1, desc2) {
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

module.exports = router;
