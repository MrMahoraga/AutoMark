const nodemailer = require('nodemailer');
const { sendSms } = require('./sms');

console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'set' : 'no');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'set' : 'no');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendAbsenceNotification(parentEmail, parentPhone, studentName, date) {
  const message = `Dear Parent, Your child ${studentName} was marked absent on ${date.toDateString()}. Regards, School Attendance System`;

  // Send email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: parentEmail,
    subject: `Attendance Alert for ${studentName}`,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Absence email sent to ${parentEmail}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }

  // Send SMS if phone number provided
  if (parentPhone) {
    try {
      await sendSms(parentPhone, message);
      console.log(`Absence SMS sent to ${parentPhone}`);
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  }
}

async function sendTeacherIdEmail(teacherEmail, teacherId) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: teacherEmail,
    subject: 'Your Teacher ID',
    text: `Dear Teacher,\n\nYour account has been created successfully. Your Teacher ID is: ${teacherId}\n\nPlease keep this ID safe as it will be used to create student accounts under your supervision.\n\nRegards,\nSchool Attendance System`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Teacher ID email sent to ${teacherEmail}`);
  } catch (error) {
    console.error('Error sending teacher ID email:', error);
  }
}

module.exports = { sendAbsenceNotification, sendTeacherIdEmail };
