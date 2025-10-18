import { NextRequest, NextResponse } from 'next/server';
import { sendBudgetPaymentOverdueEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email, userName } = await request.json();

    if (!email || !userName) {
      return NextResponse.json(
        { error: 'Email and userName are required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing budget payment overdue email for:', email);

    // Create mock overdue items for testing
    const mockOverdueItems = [
      {
        id: 'test-1',
        name: 'Venue Deposit',
        amount: 2500,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        daysOverdue: 5
      },
      {
        id: 'test-2', 
        name: 'Photographer Payment',
        amount: 1200,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        daysOverdue: 2
      }
    ];

    // Send the test email directly
    const success = await sendBudgetPaymentOverdueEmail(
      email,
      userName,
      mockOverdueItems
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Budget payment overdue email sent successfully!'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Test budget payment overdue failed:', error);
    return NextResponse.json(
      { error: 'Failed to send test email', details: error.message },
      { status: 500 }
    );
  }
}
