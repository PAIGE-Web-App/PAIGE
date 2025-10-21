import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import twilio from 'twilio';
import { sendNotificationEmail } from '@/lib/emailService';

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export async function POST(request: NextRequest) {
  try {
    const { userId, contactId, messageId, messageBody, contactName, messageSource } = await request.json();

    if (!userId || !contactId || !messageId || !messageBody || !contactName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Only send notifications for in-app messages, not Gmail messages
    // This prevents redundant notifications since Gmail messages are already in the user's email
    if (messageSource === 'gmail') {
      console.log('Skipping notification for Gmail message - user already has this in their email');
      return NextResponse.json({ 
        success: true, 
        message: 'Notification skipped for Gmail message',
        skipped: true,
        reason: 'Gmail messages are already in user\'s email inbox'
      });
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

    // Get contact details for better notification content
    const contactDoc = await adminDb.collection(`users/${userId}/contacts/${contactId}`).doc(contactId).get();
    const contactData = contactDoc.exists ? contactDoc.data() : null;
    const contactEmail = contactData?.email;
    const contactPhone = contactData?.phone;

    const notificationResults = {
      sms: { sent: false, error: null as string | null },
      email: { sent: false, error: null as string | null },
      push: { sent: false, error: null as string | null }
    };

    // Send SMS notification if enabled and phone number is available
    if (notificationPreferences.sms && phoneNumber && twilioClient) {
      try {
        const smsBody = `📱 New message from ${contactName} in Paige:\n\n"${messageBody.substring(0, 100)}${messageBody.length > 100 ? '...' : ''}"\n\nReply at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com/messages'}`;
        
        await twilioClient.messages.create({
          body: smsBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        
        notificationResults.sms.sent = true;
        console.log('SMS notification sent successfully to:', phoneNumber);
      } catch (error) {
        notificationResults.sms.error = error.message;
        console.error('Failed to send SMS notification:', error);
      }
    }

    // Send email notification if enabled and user email is available
    if (notificationPreferences.email && userEmail) {
      try {
        const emailSent = await sendNotificationEmail(userEmail, userName, contactName, messageBody, userId);
        
        if (emailSent) {
          notificationResults.email.sent = true;
          console.log('Email notification sent successfully to:', userEmail);
        } else {
          notificationResults.email.error = 'Failed to send email';
          console.error('Failed to send email notification');
        }
      } catch (error) {
        notificationResults.email.error = error.message;
        console.error('Failed to send email notification:', error);
      }
    }

    // TODO: Implement push notifications via Firebase Cloud Messaging
    // This would require storing FCM tokens and sending push notifications
    if (notificationPreferences.push) {
      notificationResults.push.error = 'Push notifications not yet implemented';
    }

    // Log notification request for debugging
    console.log('Notification request processed:', {
      userId,
      contactId,
      messageId,
      messageSource,
      messageBody: messageBody.substring(0, 100) + '...',
      contactName,
      results: notificationResults
    });

    // Update message to mark notification as sent
    try {
      const messageRef = adminDb.collection(`users/${userId}/contacts/${contactId}/messages`).doc(messageId);
      await messageRef.update({
        notificationSent: true,
        notificationResults,
        notificationSentAt: new Date()
      });
    } catch (error) {
      console.error('Failed to update message with notification status:', error);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notifications processed successfully',
      notificationId: `notif-${Date.now()}`,
      results: notificationResults
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    );
  }
} 