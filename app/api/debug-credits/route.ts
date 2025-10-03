import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    console.log(`🔍 Debug credits for user: ${userId}`);

    // Get user document
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const creditsData = userData.credits;
    const billingData = userData.billing;

    console.log('🔍 User credits data:', {
      credits: creditsData,
      billing: billingData,
      subscriptionTier: creditsData?.subscriptionTier,
      dailyCredits: creditsData?.dailyCredits,
      bonusCredits: creditsData?.bonusCredits
    });

    return NextResponse.json({
      userId,
      credits: creditsData,
      billing: billingData,
      subscriptionTier: creditsData?.subscriptionTier,
      dailyCredits: creditsData?.dailyCredits,
      bonusCredits: creditsData?.bonusCredits,
      lastRefresh: creditsData?.lastCreditRefresh,
      updatedAt: creditsData?.updatedAt
    });

  } catch (error) {
    console.error('Error debugging credits:', error);
    return NextResponse.json({ error: 'Failed to debug credits' }, { status: 500 });
  }
}
