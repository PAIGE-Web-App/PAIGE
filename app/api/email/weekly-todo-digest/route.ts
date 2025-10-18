import { NextRequest, NextResponse } from 'next/server';
import { sendWeeklyTodoDigest } from '@/lib/emailIntegrations';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    await sendWeeklyTodoDigest(userId);

    return NextResponse.json({
      success: true,
      message: 'Weekly todo digest sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Weekly todo digest error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send weekly todo digest',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

