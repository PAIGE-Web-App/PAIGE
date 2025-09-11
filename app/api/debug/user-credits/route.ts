import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getSubscriptionCredits } from '@/types/credits';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get user data
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    const userCredits = userData?.credits;

    // Determine user type and subscription tier
    const userRole = userData?.role || 'couple';
    const userType = userRole === 'super_admin' ? 'couple' : userRole;
    const subscriptionTier = userCredits?.subscriptionTier || 'free';

    // Get expected credits for this user type and tier
    const subscriptionCredits = getSubscriptionCredits(userType, subscriptionTier);

    // Check if credits need refresh
    const lastRefresh = userCredits?.lastCreditRefresh ? new Date(userCredits.lastCreditRefresh) : null;
    const now = new Date();
    
    let needsRefresh = false;
    if (lastRefresh) {
      const lastRefreshDay = new Date(lastRefresh.getFullYear(), lastRefresh.getMonth(), lastRefresh.getDate());
      const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      needsRefresh = currentDay > lastRefreshDay;
    }

    return NextResponse.json({
      userId,
      userData: {
        email: userData?.email || 'Unknown',
        role: userRole,
        userType,
        subscriptionTier,
        createdAt: userData?.createdAt,
        lastActive: userData?.lastActive
      },
      credits: userCredits ? {
        dailyCredits: userCredits.dailyCredits,
        bonusCredits: userCredits.bonusCredits,
        totalCreditsUsed: userCredits.totalCreditsUsed,
        lastCreditRefresh: userCredits.lastCreditRefresh,
        userType: userCredits.userType,
        subscriptionTier: userCredits.subscriptionTier
      } : null,
      expectedCredits: {
        monthlyCredits: subscriptionCredits.monthlyCredits,
        rolloverCredits: subscriptionCredits.rolloverCredits,
        creditRefresh: subscriptionCredits.creditRefresh,
        aiFeatures: subscriptionCredits.aiFeatures
      },
      refreshStatus: {
        needsRefresh,
        lastRefresh: lastRefresh?.toISOString(),
        currentTime: now.toISOString(),
        lastRefreshDay: lastRefresh ? new Date(lastRefresh.getFullYear(), lastRefresh.getMonth(), lastRefresh.getDate()).toISOString() : null,
        currentDay: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      }
    });

  } catch (error) {
    console.error('Error debugging user credits:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug user credits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
