import { NextRequest, NextResponse } from 'next/server';
import { sendMissedDeadlineReminders } from '@/lib/emailIntegrations';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing required field: userId' }, { status: 400 });
    }

    await sendMissedDeadlineReminders();

    return NextResponse.json({ success: true, message: 'Missed deadline reminders triggered' });
  } catch (error) {
    console.error('Error triggering missed deadline reminders:', error);
    return NextResponse.json({ error: 'Failed to trigger missed deadline reminders' }, { status: 500 });
  }
}
