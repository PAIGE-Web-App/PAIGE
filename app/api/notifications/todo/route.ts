import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import twilio from 'twilio';
import { sendTodoNotificationEmail } from '@/lib/emailService';

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      todoId, 
      todoName, 
      action, 
      assignedBy, 
      assignedTo, 
      notificationType = 'all' 
    } = await request.json();

    if (!userId || !todoId || !todoName || !action || !assignedBy || !assignedTo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Get assignee info (partner or planner)
    let assigneeEmail = '';
    let assigneeName = '';
    
    if (assignedTo === 'partner') {
      assigneeEmail = userData?.partnerEmail || '';
      assigneeName = userData?.partnerName || 'Partner';
    } else if (assignedTo === 'planner') {
      assigneeEmail = userData?.plannerEmail || '';
      assigneeName = userData?.plannerName || 'Wedding Planner';
    }

    // If no email for assignee, store pending notification for later
    if (!assigneeEmail) {
      console.log('No email found for assignee, storing pending notification');
      
      // Store pending notification in Firestore
      const pendingNotificationRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('pendingNotifications')
        .doc();
      
      await pendingNotificationRef.set({
        assigneeType: assignedTo,
        assigneeName,
        assignedBy,
        todoId,
        todoName,
        action,
        createdAt: new Date(),
        userId
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Notification stored as pending - will send when email is added',
        skipped: true,
        reason: 'No email address for assignee',
        pendingNotificationId: pendingNotificationRef.id
      });
    }

    const notificationResults = {
      sms: { sent: false, error: null as string | null },
      email: { sent: false, error: null as string | null },
      push: { sent: false, error: null as string | null }
    };

    // Send SMS notification if enabled and phone number is available
    if (notificationPreferences.sms && phoneNumber && twilioClient) {
      try {
        const actionText = action === 'assigned' ? 'assigned to you' : 
                          action === 'updated' ? 'updated' : 'marked as completed';
        
        const smsBody = `📋 To-do item "${todoName}" ${actionText} by ${assignedBy} in Paige.\n\nView at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://paige.app'}/todo`;
        
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

    // Send email notification if enabled and assignee email is available
    if (notificationPreferences.email && assigneeEmail) {
      try {
        const emailSent = await sendTodoNotificationEmail(
          assigneeEmail, 
          assigneeName, 
          todoName, 
          action, 
          assignedBy, 
          userId
        );
        
        if (emailSent) {
          notificationResults.email.sent = true;
          console.log('Email notification sent successfully to:', assigneeEmail);
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
    if (notificationPreferences.push) {
      notificationResults.push.error = 'Push notifications not yet implemented';
    }

    // Log notification results
    console.log('Todo notification results:', {
      todoId,
      action,
      assignedBy,
      assignedTo,
      results: notificationResults
    });

    return NextResponse.json({
      success: true,
      message: 'Todo notification processed',
      results: notificationResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Todo notification error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send todo notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 