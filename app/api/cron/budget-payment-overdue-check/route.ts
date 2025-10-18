import { NextRequest, NextResponse } from 'next/server';
import { sendBudgetPaymentOverdueReminders } from '@/lib/emailIntegrations';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expectedToken = process.env.CRON_SECRET || 'test-secret-123';
    
    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Budget payment overdue check cron job triggered');
    await sendBudgetPaymentOverdueReminders();
    
    return NextResponse.json({
      success: true,
      message: 'Budget payment overdue check completed'
    });
    
  } catch (error) {
    console.error('❌ Budget payment overdue cron job failed:', error);
    return NextResponse.json({ 
      error: 'Failed to process budget payment overdue cron job' 
    }, { status: 500 });
  }
}
