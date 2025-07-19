// Test script for SMS functionality
// Run with: node test-sms.js

const twilio = require('twilio');

// Check if environment variables are set
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !phoneNumber) {
  console.error('❌ Missing Twilio environment variables:');
  console.error('   TWILIO_ACCOUNT_SID:', accountSid ? '✅ Set' : '❌ Missing');
  console.error('   TWILIO_AUTH_TOKEN:', authToken ? '✅ Set' : '❌ Missing');
  console.error('   TWILIO_PHONE_NUMBER:', phoneNumber ? '✅ Set' : '❌ Missing');
  console.error('\nPlease set these in your .env.local file');
  process.exit(1);
}

console.log('✅ Twilio environment variables are set');
console.log('📱 Twilio Phone Number:', phoneNumber);

// Test Twilio client initialization
try {
  const client = twilio(accountSid, authToken);
  console.log('✅ Twilio client initialized successfully');
  
  // Test account info (this will verify credentials)
  client.api.accounts(accountSid)
    .fetch()
    .then(account => {
      console.log('✅ Twilio credentials are valid');
      console.log('   Account Name:', account.friendlyName);
      console.log('   Account Status:', account.status);
      console.log('\n🎉 SMS setup is ready!');
      console.log('\nNext steps:');
      console.log('1. Configure webhook URL in Twilio console');
      console.log('2. Test sending SMS from your app');
      console.log('3. Test receiving SMS replies');
    })
    .catch(error => {
      console.error('❌ Twilio credentials are invalid:', error.message);
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Failed to initialize Twilio client:', error.message);
  process.exit(1);
} 