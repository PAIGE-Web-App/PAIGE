import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { creditService } from '@/lib/creditService';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    console.log(`[TEST] Manually triggering webhook logic for user: ${userId}`);

    // Simulate the webhook logic
    const refreshedCredits = await creditService.forceRefreshCredits(userId);
    
    if (refreshedCredits) {
      console.log(`[TEST] Credits refreshed successfully for user ${userId}. New daily credits: ${refreshedCredits.dailyCredits}`);
      
      // Emit event to update UI
      try {
        const { creditEventEmitter } = await import('@/utils/creditEventEmitter');
        creditEventEmitter.emit('creditsUpdated', { userId, credits: refreshedCredits });
        console.log(`[TEST] Emitted credit update event for user ${userId}`);
      } catch (eventError) {
        console.error(`[TEST] Error emitting credit update event for user ${userId}:`, eventError);
      }
      
      return NextResponse.json({ 
        message: 'Webhook logic triggered successfully', 
        credits: refreshedCredits 
      });
    } else {
      console.error(`[TEST] Failed to refresh credits for user ${userId}`);
      return NextResponse.json({ error: 'Failed to refresh credits' }, { status: 500 });
    }
  } catch (error) {
    console.error('[TEST] Error in webhook trigger:', error);
    return NextResponse.json({ error: 'Failed to trigger webhook logic' }, { status: 500 });
  }
}
