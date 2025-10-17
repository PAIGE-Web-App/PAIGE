import { NextRequest, NextResponse } from 'next/server';
import { timelineService } from '@/lib/timelineService';

export async function PATCH(req: NextRequest) {
  try {
    const { timelineId, name, userId } = await req.json();

    if (!timelineId || !name || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: timelineId, name, userId' },
        { status: 400 }
      );
    }

    // Update timeline name
    await timelineService.updateTimeline(userId, timelineId, { name });

    return NextResponse.json({
      success: true,
      message: 'Timeline updated successfully'
    });
  } catch (error) {
    console.error('Error updating timeline:', error);
    return NextResponse.json(
      { error: 'Failed to update timeline', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { timelineId, updates, userId } = await req.json();

    if (!timelineId || !updates || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: timelineId, updates, userId' },
        { status: 400 }
      );
    }

    // Update timeline with provided updates
    await timelineService.updateTimeline(userId, timelineId, updates);

    return NextResponse.json({
      success: true,
      message: 'Timeline updated successfully'
    });
  } catch (error) {
    console.error('Error updating timeline:', error);
    return NextResponse.json(
      { error: 'Failed to update timeline', details: (error as Error).message },
      { status: 500 }
    );
  }
}
