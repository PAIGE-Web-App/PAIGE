import { NextRequest, NextResponse } from 'next/server';
import { sendBudgetCreationReminderEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email, userName } = await request.json();

    if (!email || !userName) {
      return NextResponse.json(
        { error: 'Email and userName are required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing budget creation reminder email for:', email);

    // Send the test email directly
    const success = await sendBudgetCreationReminderEmail(
      email,
      userName
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Budget creation reminder email sent successfully!'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Test budget creation reminder failed:', error);
    return NextResponse.json(
      { error: 'Failed to send test email', details: error.message },
      { status: 500 }
    );
  }
}
