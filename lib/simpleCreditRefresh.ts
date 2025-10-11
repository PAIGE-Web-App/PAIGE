/**
 * Simple Credit Refresh System
 * A lightweight alternative to the complex scheduled task system
 * This runs directly via HTTP calls from external cron services
 */

import { adminDb } from '@/lib/firebaseAdmin';
import { CreditServiceAdmin } from './creditServiceAdmin';

const creditServiceAdmin = new CreditServiceAdmin();

/**
 * Simple credit refresh function that can be called via HTTP
 * This is designed to be called by external cron services
 */
export async function refreshAllUserCredits(): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
  metrics: {
    totalUsers: number;
    refreshed: number;
    skipped: number;
    failed: number;
  };
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let processed = 0;
  let refreshed = 0;
  let skipped = 0;
  let failed = 0;

  try {
    console.log('🔄 Starting simple credit refresh process...');

    // Get all users in batches
    let lastDoc = null;
    const batchSize = 50;
    let totalUsers = 0;

    while (true) {
      let query = adminDb.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(batchSize);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        break;
      }

      totalUsers += snapshot.size;
      console.log(`📊 Processing batch: ${snapshot.size} users (Total: ${totalUsers})`);

      // Process users in parallel (but limit concurrency)
      const userPromises = snapshot.docs.map(async (doc) => {
        try {
          const userId = doc.id;
          const userData = doc.data();
          const userCredits = userData?.credits;

          if (!userCredits) {
            console.log(`⚠️ No credits found for user ${userId}, skipping`);
            return { status: 'skipped', reason: 'No credits found' };
          }

          // Check if credits need refresh
          const lastRefresh = new Date(userCredits.lastCreditRefresh);
          const now = new Date();
          
          const lastRefreshDay = new Date(lastRefresh.getFullYear(), lastRefresh.getMonth(), lastRefresh.getDate());
          const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          if (currentDay > lastRefreshDay) {
            // Credits need refresh
            console.log(`🔄 Refreshing credits for user ${userId}`);
            
            await creditServiceAdmin.refreshCreditsForUser(userId, userCredits);
            return { status: 'refreshed', userId };
          } else {
            // No refresh needed
            console.log(`⏭️ User ${userId} already refreshed today`);
            return { status: 'skipped', reason: 'Already refreshed today' };
          }

        } catch (error) {
          console.error(`❌ Error processing user ${doc.id}:`, error);
          return { status: 'failed', error: error.message, userId: doc.id };
        }
      });

      // Wait for batch to complete
      const results = await Promise.all(userPromises);
      
      // Count results
      results.forEach(result => {
        processed++;
        if (result.status === 'refreshed') refreshed++;
        else if (result.status === 'skipped') skipped++;
        else if (result.status === 'failed') {
          failed++;
          errors.push(`User ${result.userId}: ${result.error}`);
        }
      });

      // Set lastDoc for pagination
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    const duration = Date.now() - startTime;
    const metrics = {
      totalUsers,
      refreshed,
      skipped,
      failed,
      duration
    };

    console.log('✅ Credit refresh completed:', metrics);

    return {
      success: true,
      processed,
      errors,
      metrics
    };

  } catch (error) {
    console.error('❌ Critical error in credit refresh:', error);
    return {
      success: false,
      processed,
      errors: [`Critical error: ${error.message}`],
      metrics: {
        totalUsers: processed,
        refreshed,
        skipped,
        failed: processed - refreshed - skipped
      }
    };
  }
}

/**
 * Health check function to verify the system is working
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  timestamp: string;
  details: string;
}> {
  try {
    // Simple health check - just verify we can connect to Firestore
    const testQuery = adminDb.collection('users').limit(1);
    await testQuery.get();
    
    return {
      healthy: true,
      timestamp: new Date().toISOString(),
      details: 'Credit refresh system is healthy and ready'
    };
  } catch (error) {
    return {
      healthy: false,
      timestamp: new Date().toISOString(),
      details: `Health check failed: ${error.message}`
    };
  }
}
