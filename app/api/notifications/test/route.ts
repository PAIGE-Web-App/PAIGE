import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import twilio from 'twilio';
import nodemailer from 'nodemailer';

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export async function POST(request: NextRequest) {
  try {
    const { userId, testType } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get user's notification preferences and contact info
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const notificationPreferences = userData?.notificationPreferences || {};
    const userEmail = userData?.email;
    const phoneNumber = userData?.phoneNumber;
    const userName = userData?.userName || 'User';

    const testMessage = "This is a test notification from Paige to verify your notification settings are working correctly! 🎉";

    const results = {
      sms: { sent: false, error: null as string | null },
      email: { sent: false, error: null as string | null }
    };

    // Send test SMS if enabled and phone number is available
    if ((testType === 'sms' || testType === 'all') && notificationPreferences.sms && phoneNumber && twilioClient) {
      try {
        const smsBody = `📱 Test notification from Paige:\n\n${testMessage}\n\nIf you received this, your SMS notifications are working!`;
        
        await twilioClient.messages.create({
          body: smsBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        
        results.sms.sent = true;
        console.log('Test SMS sent successfully to:', phoneNumber);
      } catch (error) {
        results.sms.error = error.message;
        console.error('Failed to send test SMS:', error);
      }
    }

    // Send test email if enabled and user email is available
    if ((testType === 'email' || testType === 'all') && notificationPreferences.email && userEmail) {
      try {
        // Use SendGrid directly for notification tests
        const transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        });

        const testMessage = "This is a test notification from Paige to verify your notification settings are working correctly! 🎉";
        
        const mailOptions = {
          from: process.env.SENDGRID_FROM_EMAIL || 'notifications@weddingpaige.com',
          to: userEmail,
          subject: 'Test Notification from Paige',
          text: `Hello ${userName},\n\n${testMessage}\n\nIf you received this email, your email notifications are working correctly!\n\nBest regards,\nThe Paige Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #A85C36;">Test Notification from Paige</h2>
              <p>Hello ${userName},</p>
              <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; line-height: 1.6;">${testMessage}</p>
              </div>
              <p>If you received this email, your email notifications are working correctly!</p>
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                The Paige Team
              </p>
            </div>
          `
        };

        const info = await transporter.sendMail(mailOptions);
        
        results.email.sent = true;
        console.log('Test email sent successfully to:', userEmail);
        console.log('Email sent via SendGrid with message ID:', info.messageId);
      } catch (error) {
        results.email.error = error.message;
        console.error('Failed to send test email:', error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test notifications processed',
      results,
      userPreferences: notificationPreferences,
      hasPhoneNumber: !!phoneNumber,
      hasEmail: !!userEmail
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
} 