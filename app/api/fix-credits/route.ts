import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    console.log(`🔧 Fixing credits for user: ${userId}`);

    // Get current user data
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentTier = userData.credits?.subscriptionTier;
    console.log(`🔧 Current tier: ${currentTier}`);

    // Map tiers to correct daily credits
    const tierCredits = {
      'free': 15,
      'premium': 22,
      'pro': 45,
      'couple_premium': 22,
      'couple_pro': 45
    };

    const correctDailyCredits = tierCredits[currentTier as keyof typeof tierCredits] || 15;
    console.log(`🔧 Correct daily credits for ${currentTier}: ${correctDailyCredits}`);

    // Update the database
    await adminDb.collection('users').doc(userId).update({
      'credits.dailyCredits': correctDailyCredits,
      'credits.updatedAt': new Date()
    });

    console.log(`✅ Updated dailyCredits to ${correctDailyCredits} for user ${userId}`);

    // Trigger credit event emitter to update UI
    try {
      const { creditEventEmitter } = await import('@/utils/creditEventEmitter');
      const refreshedCredits = {
        ...userData.credits,
        dailyCredits: correctDailyCredits,
        updatedAt: new Date()
      };
      creditEventEmitter.emit({ userId, credits: refreshedCredits });
      console.log(`📡 Emitted creditsUpdated event for user ${userId}`);
    } catch (error) {
      console.error('Failed to emit credit event:', error);
    }

    return NextResponse.json({ 
      message: 'Credits fixed successfully', 
      dailyCredits: correctDailyCredits,
      subscriptionTier: currentTier
    });

  } catch (error) {
    console.error('Error fixing credits:', error);
    return NextResponse.json({ error: 'Failed to fix credits' }, { status: 500 });
  }
}
