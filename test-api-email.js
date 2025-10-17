// Test the API email endpoint directly
require('dotenv').config({ path: '.env.local' });

async function testAPIEmail() {
  console.log('🧪 Testing API Email Endpoint...\n');

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: process.env.SENDGRID_FROM_EMAIL,
        subject: 'API Email Test',
        body: 'This is a test email sent via the API endpoint to verify SendGrid integration!',
        from: process.env.SENDGRID_FROM_EMAIL
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ API email test successful!');
      console.log(`Message ID: ${result.messageId}`);
      console.log(`From: ${process.env.SENDGRID_FROM_EMAIL}`);
      console.log('\n🎉 API endpoint is working correctly!');
    } else {
      const error = await response.json();
      console.log('❌ API email test failed:');
      console.log(`Status: ${response.status}`);
      console.log(`Error: ${error.error || error.message}`);
    }
  } catch (error) {
    console.log('❌ API test error:', error.message);
  }
}

testAPIEmail();
