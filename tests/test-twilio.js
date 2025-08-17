require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

console.log('Testing Twilio Configuration...');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'NOT SET');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.error('❌ Missing Twilio environment variables');
  process.exit(1);
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Test with your phone number
const testPhoneNumber = '(201) 492-3327'; // Your phone number from the screenshot

console.log(`\nSending test SMS to ${testPhoneNumber}...`);

client.messages.create({
  body: '🧪 Test SMS from Paige - If you receive this, Twilio is working!',
  from: process.env.TWILIO_PHONE_NUMBER,
  to: testPhoneNumber
})
.then(message => {
  console.log('✅ SMS sent successfully!');
  console.log('Message SID:', message.sid);
  console.log('Status:', message.status);
})
.catch(error => {
  console.error('❌ Failed to send SMS:', error.message);
  console.error('Error code:', error.code);
  console.error('More info:', error.moreInfo);
}); 