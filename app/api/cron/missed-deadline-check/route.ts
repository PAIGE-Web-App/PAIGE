import { NextRequest, NextResponse } from 'next/server';
import { sendMissedDeadlineReminders } from '@/lib/emailIntegrations';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expectedToken = process.env.CRON_SECRET || 'test-secret-123';
    
    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Missed deadline check cron job triggered');
    await sendMissedDeadlineReminders();
    
    return NextResponse.json({
      success: true,
      message: 'Missed deadline check completed'
    });
    
  } catch (error) {
    console.error('❌ Missed deadline cron job failed:', error);
    return NextResponse.json({ 
      error: 'Failed to process missed deadline cron job' 
    }, { status: 500 });
  }
}
