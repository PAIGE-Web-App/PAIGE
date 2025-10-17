import { NextRequest, NextResponse } from 'next/server';
import { sendTaskNotification } from '@/lib/emailIntegrations';

export async function POST(request: NextRequest) {
  try {
    const { taskId, action, assignedToUserId, assignedByUserId } = await request.json();

    if (!taskId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, action' },
        { status: 400 }
      );
    }

    if (!['assigned', 'completed', 'updated', 'overdue'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: assigned, completed, updated, or overdue' },
        { status: 400 }
      );
    }

    console.log('📋 Triggering task notification:', { taskId, action, assignedToUserId, assignedByUserId });

    await sendTaskNotification(taskId, action, assignedToUserId, assignedByUserId);

    return NextResponse.json({ 
      success: true, 
      message: 'Task notification triggered successfully' 
    });
  } catch (error) {
    console.error('❌ Error triggering task notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
