import { NextRequest, NextResponse } from 'next/server';
import { sendBudgetCreationReminders } from '@/lib/emailIntegrations';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expectedToken = process.env.CRON_SECRET || 'test-secret-123';
    
    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Budget creation reminder cron job triggered');
    await sendBudgetCreationReminders();
    
    return NextResponse.json({
      success: true,
      message: 'Budget creation reminder check completed'
    });
    
  } catch (error) {
    console.error('❌ Budget creation reminder cron job failed:', error);
    return NextResponse.json({ 
      error: 'Failed to process budget creation reminder cron job' 
    }, { status: 500 });
  }
}
