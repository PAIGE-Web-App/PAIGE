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

    await adminDb
      .collection('users')
      .doc(userId)
      .collection('timelines')
      .doc(timelineId)
      .delete();

    return NextResponse.json({
      success: true,
      message: 'Timeline deleted successfully'
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error deleting timeline:', error);
    return NextResponse.json(
      { error: 'Failed to delete timeline' },
      { status: 500 }
    );
  }
}
