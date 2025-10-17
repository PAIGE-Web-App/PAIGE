import { NextRequest, NextResponse } from 'next/server';
import { checkAndSendCreditAlerts } from '@/lib/emailIntegrations';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    console.log('💳 Checking credit alerts for user:', userId);

    await checkAndSendCreditAlerts(userId);

    return NextResponse.json({ 
      success: true, 
      message: 'Credit alert check completed' 
    });
  } catch (error) {
    console.error('❌ Error checking credit alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
