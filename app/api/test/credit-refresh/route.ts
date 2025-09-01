import { NextRequest, NextResponse } from 'next/server';
import { creditServiceAdmin } from '@/lib/creditServiceAdmin';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with admin token
    const authHeader = request.headers.get('authorization');
    const isDev = process.env.NODE_ENV === 'development';
    const adminToken = process.env.ADMIN_TEST_TOKEN;
    
    if (!isDev && (!adminToken || authHeader !== `Bearer ${adminToken}`)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    console.log('🧪 Testing daily credit refresh for all users...');

    // Get all users with credits
    const usersSnapshot = await adminDb.collection('users')
      .where('credits', '!=', null)
      .limit(10) // Limit for testing
      .get();

    if (usersSnapshot.empty) {
      console.log('✅ No users found with credits to refresh');
      return NextResponse.json({ 
        success: true, 
        message: 'No users found with credits to refresh',
        refreshedCount: 0 
      });
    }

    let refreshedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const results: any[] = [];

    // Process users
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userCredits = userData.credits;

        if (!userCredits) {
          continue;
        }

        // Check if credits need refresh
        const lastRefresh = new Date(userCredits.lastCreditRefresh);
        const now = new Date();
        
        // Check if we've crossed midnight since last refresh
        const lastRefreshDay = new Date(lastRefresh.getFullYear(), lastRefresh.getMonth(), lastRefresh.getDate());
        const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (currentDay > lastRefreshDay) {
          // Credits need refresh
          const refreshedCredits = await creditServiceAdmin.refreshCreditsForUser(userId, userCredits);
          refreshedCount++;
          results.push({
            userId,
            email: userData.email || 'No email',
            oldCredits: userCredits.dailyCredits,
            newCredits: refreshedCredits.dailyCredits,
            refreshed: true
          });
        } else {
          results.push({
            userId,
            email: userData.email || 'No email',
            currentCredits: userCredits.dailyCredits,
            lastRefresh: userCredits.lastCreditRefresh,
            refreshed: false,
            reason: 'No refresh needed'
          });
        }
      } catch (error) {
        console.error(`❌ Error refreshing credits for user ${userDoc.id}:`, error);
        errorCount++;
        if (error instanceof Error) {
          errors.push(error.message);
        }
      }
    }

    console.log(`✅ Test credit refresh completed: ${refreshedCount} users refreshed, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: 'Test credit refresh completed',
      refreshedCount,
      errorCount,
      errors: errors.slice(0, 5), // Limit error messages in response
      results
    });

  } catch (error) {
    console.error('❌ Error in test credit refresh:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test credit refresh',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
