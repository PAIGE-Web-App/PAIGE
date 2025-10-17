import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

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

    // Get all timelines for the user, ordered by most recent
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('timelines')
      .orderBy('createdAt', 'desc')
      .get();

    const timelines = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        weddingDate: data.weddingDate?.toDate ? data.weddingDate.toDate() : new Date(data.weddingDate),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        lastSynced: data.lastSynced?.toDate ? data.lastSynced.toDate() : null,
        events: (data.events || []).map((event: any) => ({
          ...event,
          startTime: event.startTime?.toDate ? event.startTime.toDate() : new Date(event.startTime),
          endTime: event.endTime?.toDate ? event.endTime.toDate() : new Date(event.endTime),
          createdAt: event.createdAt?.toDate ? event.createdAt.toDate() : new Date(event.createdAt),
          updatedAt: event.updatedAt?.toDate ? event.updatedAt.toDate() : new Date(event.updatedAt)
        }))
      };
    });

    return NextResponse.json({
      success: true,
      timelines
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error getting timelines:', error);
    return NextResponse.json(
      { error: 'Failed to get timelines' },
      { status: 500 }
    );
  }
}
