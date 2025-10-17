// Test script to verify SendGrid setup
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testSendGrid() {
  console.log('🧪 Testing SendGrid Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`SENDGRID_FROM_EMAIL: ${process.env.SENDGRID_FROM_EMAIL || '❌ Missing'}`);
  console.log('');

  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not found in .env.local');
    console.log('Please add your SendGrid API key to .env.local');
    return;
  }

  if (!process.env.SENDGRID_FROM_EMAIL) {
    console.log('❌ SENDGRID_FROM_EMAIL not found in .env.local');
    console.log('Please add your SendGrid from email to .env.local');
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransporter({
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
    console.log('🔌 Testing connection...');
    await transporter.verify();
    console.log('✅ SendGrid connection successful!\n');

    // Send test email
    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SENDGRID_FROM_EMAIL,
      to: process.env.SENDGRID_FROM_EMAIL, // Send to yourself for testing
      subject: 'SendGrid Test Email',
      text: 'This is a test email from SendGrid to verify your setup is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #A85C36;">SendGrid Test Email</h2>
          <p>This is a test email from SendGrid to verify your setup is working correctly!</p>
          <p>If you received this email, your SendGrid configuration is working! 🎉</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log('\n🎉 SendGrid is configured correctly!');
    console.log('Check your email inbox for the test message.');
    
    // Also test via API
    console.log('\n🔌 Testing via API endpoint...');
    try {
      const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: process.env.SENDGRID_FROM_EMAIL,
          subject: 'SendGrid API Test Email',
          body: 'This is a test email sent via the API endpoint to verify SendGrid integration!',
          from: process.env.SENDGRID_FROM_EMAIL
        })
      });
      
      if (apiResponse.ok) {
        const apiResult = await apiResponse.json();
        console.log('✅ API test successful!');
        console.log(`API Message ID: ${apiResult.messageId}`);
      } else {
        const apiError = await apiResponse.json();
        console.log('❌ API test failed:', apiError.error);
      }
    } catch (apiError) {
      console.log('❌ API test error:', apiError.message);
    }

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

testSendGrid();
