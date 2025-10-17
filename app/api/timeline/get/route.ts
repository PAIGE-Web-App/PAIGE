import { NextRequest, NextResponse } from 'next/server';
import { timelineService } from '@/lib/timelineService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const timeline = await timelineService.getTimeline(userId);

    return NextResponse.json({
      success: true,
      timeline
    });
  } catch (error) {
    console.error('Error getting timeline:', error);
    return NextResponse.json(
      { error: 'Failed to get timeline' },
      { status: 500 }
    );
  }
}
