require('dotenv').config();
console.log('CWD:', process.cwd());
console.log('EMAIL_USER loaded:', process.env.EMAIL_USER ? 'yes' : 'no');
console.log('EMAIL_PASS loaded:', process.env.EMAIL_PASS ? 'yes' : 'no');
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'yes' : 'no');

// Temporary fix for .env loading issue
if (!process.env.EMAIL_USER) process.env.EMAIL_USER = 'hemantk1014@gmail.com';
if (!process.env.EMAIL_PASS) process.env.EMAIL_PASS = 'xbsu ecce lgyn hkos';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'your_jwt_secret_key_here';
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimiter = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const schoolRoutes = require('./routes/school');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');

const app = express();

app.use(cors());
app.use(helmet());
app.use(rateLimiter);
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/sih';

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));