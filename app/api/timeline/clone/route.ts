import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId, timelineId } = await req.json();

    if (!userId || !timelineId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, timelineId' },
        { status: 400 }
      );
    }

    // Get the original timeline
    const originalDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('timelines')
      .doc(timelineId)
      .get();

    if (!originalDoc.exists) {
      return NextResponse.json(
        { error: 'Timeline not found' },
        { status: 404 }
      );
    }

    const originalData = originalDoc.data();
    
    // Create cloned timeline with new ID and timestamps
    const now = new Date();
    const clonedData = {
      ...originalData,
      createdAt: now,
      updatedAt: now,
      lastSynced: null, // Reset sync status for clone
      // Reset all event statuses to pending for the clone
      events: originalData?.events?.map((event: any) => ({
        ...event,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      })) || []
    };

    const clonedDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('timelines')
      .add(clonedData);

    return NextResponse.json({
      success: true,
      timeline: {
        id: clonedDoc.id,
        ...clonedData
      }
    });
  } catch (error) {
    console.error('Error cloning timeline:', error);
    return NextResponse.json(
      { error: 'Failed to clone timeline' },
      { status: 500 }
    );
  }
}
