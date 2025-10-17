import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // TODO: Implement Google Calendar sync status check
    // For now, return default status
    const syncStatus = {
      isLinked: false,
      lastSynced: null,
      weddingPartyMembers: [],
      syncEnabled: false
    };

    return NextResponse.json({
      success: true,
      ...syncStatus
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
