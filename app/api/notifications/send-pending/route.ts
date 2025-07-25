import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendTodoNotificationEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { userId, assigneeType, assigneeEmail, assigneeName } = await request.json();

    if (!userId || !assigneeType || !assigneeEmail || !assigneeName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get pending notifications for this assignee
    const pendingNotificationsRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('pendingNotifications');
    
    const pendingQuery = pendingNotificationsRef.where('assigneeType', '==', assigneeType);
    const pendingSnapshot = await pendingQuery.get();

    if (pendingSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No pending notifications found',
        sentCount: 0
      });
    }

    const pendingNotifications = pendingSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        assigneeType: data.assigneeType,
        assigneeName: data.assigneeName,
        assignedBy: data.assignedBy,
        todoId: data.todoId,
        todoName: data.todoName,
        action: data.action,
        createdAt: data.createdAt,
        userId: data.userId
      };
    });

    // Sort by creation date (oldest first)
    pendingNotifications.sort((a, b) => a.createdAt.toDate() - b.createdAt.toDate());

    let sentCount = 0;
    const batch = adminDb.batch();

    // Send invitation email with summary of pending items
    if (pendingNotifications.length > 0) {
      const latestNotification = pendingNotifications[pendingNotifications.length - 1];
      const assignedBy = latestNotification.assignedBy;
      
      // Create invitation email content
      const invitationSubject = `You have ${pendingNotifications.length} task${pendingNotifications.length > 1 ? 's' : ''} assigned to you in Paige`;
      
      const taskList = pendingNotifications
        .map((notification, index) => `${index + 1}. "${notification.todoName}" (${notification.action})`)
        .join('\n');
      
      const emailContent = {
        to: assigneeEmail,
        subject: invitationSubject,
        text: `Hello ${assigneeName},\n\n${assignedBy} has assigned ${pendingNotifications.length} task${pendingNotifications.length > 1 ? 's' : ''} to you in Paige:\n\n${taskList}\n\nJoin Paige to view and manage these tasks: ${process.env.NEXT_PUBLIC_APP_URL || 'https://paige.app'}/signup\n\nBest regards,\nThe Paige Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #A85C36;">You Have Tasks Assigned to You!</h2>
            <p>Hello ${assigneeName},</p>
            <div style="background-color: #f8f6f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; line-height: 1.6;"><strong>${assignedBy}</strong> has assigned ${pendingNotifications.length} task${pendingNotifications.length > 1 ? 's' : ''} to you in Paige:</p>
              <div style="margin: 15px 0; padding-left: 20px;">
                ${pendingNotifications.map((notification, index) => 
                  `<p style="margin: 5px 0; line-height: 1.4;"><strong>${index + 1}.</strong> "${notification.todoName}" <em>(${notification.action})</em></p>`
                ).join('')}
              </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://paige.app'}/signup" 
                 style="background-color: #A85C36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Join Paige to View Tasks
              </a>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">
              This invitation was sent from Paige - your wedding planning assistant
            </p>
          </div>
        `
      };

      // Send the invitation email
      const emailSent = await sendTodoNotificationEmail(
        assigneeEmail,
        assigneeName,
        `${pendingNotifications.length} task${pendingNotifications.length > 1 ? 's' : ''}`,
        'assigned',
        assignedBy,
        userId
      );

      if (emailSent) {
        sentCount = 1;
        console.log(`Invitation email sent to ${assigneeEmail} for ${pendingNotifications.length} pending tasks`);
      }
    }

    // Delete all pending notifications for this assignee
    pendingSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingNotifications.length} pending notifications`,
      sentCount,
      processedCount: pendingNotifications.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing pending notifications:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process pending notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 