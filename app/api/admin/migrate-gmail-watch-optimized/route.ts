import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * Admin endpoint to migrate all users to optimized Gmail Watch API
 * This enables the optimized webhook configuration for all users with Gmail connected
 */
export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database not available' 
      }, { status: 500 });
    }

    console.log('Gmail Watch Migration: Starting migration to optimized webhook...');

    // Get all users with Gmail connected
    const usersSnapshot = await adminDb.collection('users')
      .where('gmailConnected', '==', true)
      .where('gmailWatch.isActive', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('Gmail Watch Migration: No users found with active Gmail Watch');
      return NextResponse.json({
        success: true,
        message: 'No users found with active Gmail Watch',
        migrated: 0
      });
    }

    console.log(`Gmail Watch Migration: Found ${usersSnapshot.docs.length} users with active Gmail Watch`);

    const batch = adminDb.batch();
    let migratedCount = 0;
    const errors: string[] = [];

    // Process users in batches
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const gmailWatch = userData.gmailWatch || {};

        // Update Gmail Watch configuration with optimized settings
        const optimizedConfig = {
          ...gmailWatch,
          useOptimizedWebhook: true,
          maxMessagesPerWebhook: 3,
          processingDelayMs: 2000,
          migratedToOptimized: true,
          migrationDate: new Date().toISOString()
        };

        // Add to batch
        batch.update(userDoc.ref, {
          gmailWatch: optimizedConfig
        });

        migratedCount++;

        // Commit batch every 500 users to avoid Firestore limits
        if (migratedCount % 500 === 0) {
          await batch.commit();
          console.log(`Gmail Watch Migration: Migrated ${migratedCount} users so far...`);
        }

      } catch (error: any) {
        console.error(`Gmail Watch Migration: Error migrating user ${userDoc.id}:`, error);
        errors.push(`User ${userDoc.id}: ${error.message}`);
      }
    }

    // Commit remaining changes
    if (migratedCount % 500 !== 0) {
      await batch.commit();
    }

    console.log(`Gmail Watch Migration: Successfully migrated ${migratedCount} users to optimized Gmail Watch`);

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${migratedCount} users to optimized Gmail Watch`,
      migrated: migratedCount,
      total: usersSnapshot.docs.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Gmail Watch Migration: Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Get migration status
 */
export async function GET(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database not available' 
      }, { status: 500 });
    }

    // Count users with Gmail connected
    const totalGmailUsers = await adminDb.collection('users')
      .where('gmailConnected', '==', true)
      .get();

    // Count users with active Gmail Watch
    const activeWatchUsers = await adminDb.collection('users')
      .where('gmailConnected', '==', true)
      .where('gmailWatch.isActive', '==', true)
      .get();

    // Count users with optimized Gmail Watch
    const optimizedWatchUsers = await adminDb.collection('users')
      .where('gmailConnected', '==', true)
      .where('gmailWatch.useOptimizedWebhook', '==', true)
      .get();

    return NextResponse.json({
      success: true,
      stats: {
        totalGmailUsers: totalGmailUsers.docs.length,
        activeWatchUsers: activeWatchUsers.docs.length,
        optimizedWatchUsers: optimizedWatchUsers.docs.length,
        migrationProgress: `${optimizedWatchUsers.docs.length}/${activeWatchUsers.docs.length}`
      },
      recommendations: [
        'Run POST to migrate all users to optimized webhook',
        'Update Pub/Sub topic to point to optimized webhook URL',
        'Monitor rate limit improvements after migration'
      ]
    });

  } catch (error: any) {
    console.error('Gmail Watch Migration Status: Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
