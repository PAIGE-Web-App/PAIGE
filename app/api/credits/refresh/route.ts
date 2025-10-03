import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { creditService } from '@/lib/creditService';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the Firebase token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Force refresh credits
    const refreshedCredits = await creditService.forceRefreshCredits(userId);
    
    if (!refreshedCredits) {
      return NextResponse.json({ error: 'Failed to refresh credits' }, { status: 500 });
    }

    // Notify frontend that credits have been updated
    try {
      const { creditEventEmitter } = await import('@/utils/creditEventEmitter');
      creditEventEmitter.emit('creditsUpdated', { userId, credits: refreshedCredits });
      console.log(`📡 Emitted credit update event for user ${userId}`);
    } catch (eventError) {
      console.error(`❌ Error emitting credit update event for user ${userId}:`, eventError);
    }

    return NextResponse.json({ 
      success: true, 
      credits: refreshedCredits 
    });

  } catch (error) {
    console.error('Error refreshing credits:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh credits' 
    }, { status: 500 });
  }
}
