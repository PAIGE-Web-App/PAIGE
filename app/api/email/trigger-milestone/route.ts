import { NextRequest, NextResponse } from 'next/server';
import { checkAndSendMilestoneEmails } from '@/lib/emailIntegrations';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    console.log('🎯 Checking milestone emails for user:', userId);

    await checkAndSendMilestoneEmails(userId);

    return NextResponse.json({ 
      success: true, 
      message: 'Milestone email check completed' 
    });
  } catch (error) {
    console.error('❌ Error checking milestone emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
