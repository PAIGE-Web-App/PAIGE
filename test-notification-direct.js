// Test notification directly without queue
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testNotificationDirect() {
  console.log('🧪 Testing Notification Directly (Bypassing Queue)...\n');

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

    // Send test notification email (same as the notification test)
    console.log('📧 Sending test notification email...');
    const info = await transporter.sendMail({
      from: process.env.SENDGRID_FROM_EMAIL,
      to: 'dave.yoon92@gmail.com', // Your actual email
      subject: 'Test Notification from Paige',
      text: `Hello Davey Jones,\n\nThis is a test notification from Paige to verify your notification settings are working correctly! 🎉\n\nIf you received this email, your email notifications are working correctly!\n\nBest regards,\nThe Paige Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #A85C36;">Test Notification from Paige</h2>
          <p>Hello Davey Jones,</p>
          <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; line-height: 1.6;">This is a test notification from Paige to verify your notification settings are working correctly! 🎉</p>
          </div>
          <p>If you received this email, your email notifications are working correctly!</p>
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Paige Team
          </p>
        </div>
      `
    });

    console.log('✅ Test notification sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`From: ${process.env.SENDGRID_FROM_EMAIL}`);
    console.log('\n🎉 Notification test via SendGrid successful!');
    console.log('Check your email inbox for the test message.');

  } catch (error) {
    console.log('❌ SendGrid notification test failed:');
    console.log(error.message);
  }
}

testNotificationDirect();
