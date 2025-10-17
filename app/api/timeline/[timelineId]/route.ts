import { NextRequest, NextResponse } from 'next/server';
import { timelineService } from '@/lib/timelineService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ timelineId: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const { timelineId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    const timeline = await timelineService.getTimelineById(userId, timelineId);

    if (!timeline) {
      return NextResponse.json(
        { error: 'Timeline not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(timeline, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline', details: (error as Error).message },
      { status: 500 }
    );
  }
}
