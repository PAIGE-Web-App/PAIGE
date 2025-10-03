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

    console.log(`🔄 Force refreshing credits for user ${userId}...`);

    // Get current user data to check subscription tier
    const adminDb = (await import('@/lib/firebaseAdmin')).adminDb;
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    const currentTier = userData?.credits?.subscriptionTier;
    const userType = userData?.credits?.userType || 'couple';

    console.log(`📊 Current tier: ${currentTier}, userType: ${userType}`);

    // Get the correct credit amount for the tier
    const { COUPLE_SUBSCRIPTION_CREDITS } = await import('@/types/credits');
    const subscriptionCredits = COUPLE_SUBSCRIPTION_CREDITS[currentTier as keyof typeof COUPLE_SUBSCRIPTION_CREDITS];
    
    if (!subscriptionCredits) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
    }

    const correctDailyCredits = subscriptionCredits.monthlyCredits;
    console.log(`💰 Correct daily credits for ${currentTier}: ${correctDailyCredits}`);

    // Update the user's daily credits
    await userRef.update({
      'credits.dailyCredits': correctDailyCredits,
      'credits.lastCreditRefresh': new Date(),
      'credits.updatedAt': new Date()
    });

    console.log(`✅ Updated daily credits to ${correctDailyCredits}`);

    // Notify frontend that credits have been updated
    try {
      const { creditEventEmitter } = await import('@/lib/creditEventEmitter');
      creditEventEmitter.emit('creditsUpdated', { userId, credits: correctDailyCredits });
      console.log(`📡 Emitted credit update event for user ${userId}`);
    } catch (eventError) {
      console.error(`❌ Error emitting credit update event for user ${userId}:`, eventError);
    }

    return NextResponse.json({ 
      success: true, 
      dailyCredits: correctDailyCredits,
      subscriptionTier: currentTier
    });

  } catch (error) {
    console.error('Error force refreshing credits:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh credits' 
    }, { status: 500 });
  }
}
