require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function testGmailConnection() {
  console.log('🔍 Testing Gmail OAuth Connection...');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ SET' : '❌ NOT SET');
  console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ SET' : '❌ NOT SET');
  console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '❌ NOT SET');
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('\n❌ Missing Google OAuth environment variables');
    return;
  }
  
  console.log('\n✅ Environment variables are set correctly!');
  console.log('\n🔍 To test your Gmail connection, please:');
  console.log('1. Go to your app in the browser');
  console.log('2. Open Developer Tools (F12)');
  console.log('3. Go to the Console tab');
  console.log('4. Copy and paste this command:');
  console.log('\n--- COPY THIS COMMAND ---');
  console.log(`
// Get your user ID and check Gmail connection
const user = firebase.auth().currentUser;
if (user) {
  console.log('Your User ID:', user.uid);
  console.log('Your Email:', user.email);
  
  // Check if Gmail is connected
  fetch('/api/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.uid,
      testType: 'email'
    }),
  })
  .then(response => response.json())
  .then(data => {
    console.log('Test result:', data);
    if (data.success) {
      console.log('✅ Email test successful!');
    } else {
      console.log('❌ Email test failed:', data.error);
    }
  })
  .catch(error => {
    console.error('❌ Error testing email:', error);
  });
} else {
  console.log('No user logged in');
}
  `);
  console.log('--- END COMMAND ---\n');
  
  console.log('5. Check the console output for results');
  console.log('6. If you see errors, the issue will be shown there');
}

testGmailConnection(); 