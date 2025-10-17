import { NextRequest, NextResponse } from 'next/server';
import { timelineService } from '@/lib/timelineService';
import { WeddingTimelineEvent } from '@/types/timeline';

export async function POST(req: NextRequest) {
  try {
    const { userId, timelineId, eventId, updates } = await req.json();

    console.log('Update event request:', { userId, timelineId, eventId, updates });

    if (!userId || !timelineId || !eventId || !updates) {
      console.error('Missing required fields:', { userId, timelineId, eventId, updates });
      return NextResponse.json(
        { error: 'Missing required fields: userId, timelineId, eventId, updates' },
        { status: 400 }
      );
    }

    // Update the specific event in the timeline
    console.log('Calling timelineService.updateEvent...');
    console.log('Parameters:', { userId, timelineId, eventId, updates });
    
    try {
      await timelineService.updateEvent(userId, timelineId, eventId, updates);
      console.log('Event updated successfully');
    } catch (serviceError) {
      console.error('TimelineService.updateEvent failed:', serviceError);
      console.error('Service error stack:', (serviceError as Error).stack);
      throw serviceError;
    }

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully'
    });
  } catch (error) {
    console.error('Error updating event:', error);
    console.error('Error stack:', (error as Error).stack);
    console.error('Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      cause: (error as Error).cause
    });
    return NextResponse.json(
      { error: 'Failed to update event', details: (error as Error).message },
      { status: 500 }
    );
  }
}