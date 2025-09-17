const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Student = require('../models/Student');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Student requests leave
router.post('/request',
  auth(['student']),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('reason').notEmpty(),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { startDate, endDate, reason } = req.body;
    const studentId = req.user.id;

    const leave = new Leave({
      student: studentId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
    });

    await leave.save();
    res.json({ message: 'Leave request submitted successfully', leave });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Teacher views leave requests for their students
router.get('/requests', auth(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const students = await Student.find({ teacher: teacherId }).select('_id');
    const studentIds = students.map(s => s._id);

    const leaveRequests = await Leave.find({ student: { $in: studentIds } })
      .populate('student', 'name email')
      .sort({ createdAt: -1 });

    res.json(leaveRequests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Teacher approves or rejects leave request
router.put('/approve/:id', auth(['teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;
    const teacherId = req.user.id;

    const leave = await Leave.findById(id).populate('student');
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    // Check if teacher is authorized for this student
    if (leave.student.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: 'Not authorized to approve this leave' });
    }

    leave.status = status;
    leave.approvedBy = teacherId;
    if (comments) leave.comments = comments;

    await leave.save();
    res.json({ message: `Leave ${status}`, leave });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Student views their own leave requests
router.get('/my-requests', auth(['student']), async (req, res) => {
  try {
    const studentId = req.user.id;
    const leaveRequests = await Leave.find({ student: studentId }).sort({ createdAt: -1 });
    res.json(leaveRequests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
