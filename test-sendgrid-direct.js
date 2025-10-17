// Direct SendGrid test to verify configuration
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testSendGridDirect() {
  console.log('🧪 Testing SendGrid Configuration Directly...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`SENDGRID_FROM_EMAIL: ${process.env.SENDGRID_FROM_EMAIL || '❌ Missing'}`);
  console.log('');

  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not found in .env.local');
    return;
  }

  if (!process.env.SENDGRID_FROM_EMAIL) {
    console.log('❌ SENDGRID_FROM_EMAIL not found in .env.local');
    return;
  }

  // Create SendGrid transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });

  try {
    // Test connection
    console.log('🔌 Testing SendGrid connection...');
    await transporter.verify();
    console.log('✅ SendGrid connection successful!\n');

    // Send test email
    console.log('📧 Sending test email via SendGrid...');
    const info = await transporter.sendMail({
      from: process.env.SENDGRID_FROM_EMAIL,
      to: process.env.SENDGRID_FROM_EMAIL, // Send to yourself for testing
      subject: 'SendGrid Direct Test Email',
      text: 'This is a direct test email from SendGrid to verify your configuration is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #A85C36;">SendGrid Direct Test Email</h2>
          <p>This is a direct test email from SendGrid to verify your configuration is working correctly!</p>
          <p>If you received this email, your SendGrid setup is working! 🎉</p>
          <p><strong>From:</strong> ${process.env.SENDGRID_FROM_EMAIL}</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`From: ${process.env.SENDGRID_FROM_EMAIL}`);
    console.log('\n🎉 SendGrid is configured correctly!');
    console.log('Check your email inbox for the test message.');

  } catch (error) {
    console.log('❌ SendGrid test failed:');
    console.log(error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Troubleshooting:');
      console.log('- Check your SENDGRID_API_KEY is correct');
      console.log('- Ensure the API key has "Mail Send" permissions');
      console.log('- Verify your SendGrid account is active');
    }
  }
}

testSendGridDirect();
