import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    // Get count of waitlist entries
    const snapshot = await adminDb
      .collection('waitlist')
      .count()
      .get();

    const count = snapshot.data().count || 0;

    return NextResponse.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Error getting waitlist count:', error);
    return NextResponse.json(
      { error: 'Failed to get waitlist count' },
      { status: 500 }
    );
  }
}

