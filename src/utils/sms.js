const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function sendSms(to, body) {
  try {
    const message = await client.messages.create({
      body,
      from: fromPhone,
      to,
    });
    console.log(`SMS sent to ${to}: ${message.sid}`);
  } catch (error) {
    console.error('Error sending SMS:', error);
  }
}

module.exports = { sendSms };
