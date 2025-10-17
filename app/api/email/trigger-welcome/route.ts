import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmailOnSignup } from '@/lib/emailIntegrations';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    console.log('📧 Triggering welcome email for user:', userId);

    await sendWelcomeEmailOnSignup(userId);

    return NextResponse.json({ 
      success: true, 
      message: 'Welcome email triggered successfully' 
    });
  } catch (error) {
    console.error('❌ Error triggering welcome email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
