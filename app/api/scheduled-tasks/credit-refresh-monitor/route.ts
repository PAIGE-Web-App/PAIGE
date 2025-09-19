import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

interface CreditRefreshStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  averageProcessingTime: number;
  lastRunTime?: Date;
  nextScheduledRun?: Date;
  errors: Array<{jobId: string, error: string, timestamp: Date}>;
  recentActivity: Array<{
    jobId: string;
    userId: string;
    email: string;
    status: string;
    timestamp: Date;
    result?: any;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Allow public access for monitoring (read-only)
    // This endpoint only shows status, doesn't modify anything

    console.log('📊 Generating credit refresh monitoring stats...');

    const stats: CreditRefreshStats = {
      totalJobs: 0,
      pendingJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      successRate: 0,
      averageProcessingTime: 0,
      errors: [],
      recentActivity: []
    };

    // Check if Firestore is available
    if (!adminDb) {
      return NextResponse.json({
        error: 'Database not available',
        details: 'Firestore connection not initialized',
        systemStatus: 'inactive',
        lastRefresh: new Date().toISOString()
      });
    }

    // Get job statistics by status using Admin SDK
    const statuses = ['pending', 'processing', 'completed', 'failed'] as const;
    
    for (const status of statuses) {
      try {
        const statusSnapshot = await adminDb.collection('credit_refresh_jobs')
          .where('status', '==', status)
          .get();
        
        const count = statusSnapshot.size;
        
        switch (status) {
          case 'pending':
            stats.pendingJobs = count;
            break;
          case 'processing':
            stats.processingJobs = count;
            break;
          case 'completed':
            stats.completedJobs = count;
            break;
          case 'failed':
            stats.failedJobs = count;
            break;
        }
        
        stats.totalJobs += count;
      } catch (error) {
        console.error(`Error getting ${status} jobs:`, error);
        stats.errors.push({
          jobId: 'system',
          error: `Failed to get ${status} jobs: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        });
      }
    }

    // Calculate success rate
    if (stats.totalJobs > 0) {
      stats.successRate = (stats.completedJobs / stats.totalJobs) * 100;
    }

    // Get recent activity (last 20 jobs) using Admin SDK
    try {
      const recentSnapshot = await adminDb.collection('credit_refresh_jobs')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      
      stats.recentActivity = recentSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          jobId: doc.id,
          userId: data.userId,
          email: data.email,
          status: data.status,
          timestamp: data.createdAt?.toDate() || new Date(),
          result: data.result
        };
      });
    } catch (error) {
      console.error('Error getting recent activity:', error);
      stats.errors.push({
        jobId: 'system',
        error: `Failed to get recent activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    // Get recent errors (last 10 failed jobs) using Admin SDK
    // Skip this query if no jobs exist to avoid index requirements
    try {
      // First check if collection exists and has any documents
      const collectionSnapshot = await adminDb.collection('credit_refresh_jobs').limit(1).get();
      
      if (collectionSnapshot.empty) {
        // No jobs exist yet, skip error queries
        console.log('No credit refresh jobs found, skipping error queries');
      } else {
        // Only query for errors if jobs exist
        const errorsSnapshot = await adminDb.collection('credit_refresh_jobs')
          .where('status', '==', 'failed')
          .limit(10) // Remove orderBy to avoid index requirement
          .get();
        
        const recentErrors = errorsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            jobId: doc.id,
            error: data.error || 'Unknown error',
            timestamp: data.createdAt?.toDate() || new Date()
          };
        });
        
        stats.errors.push(...recentErrors);
      }
    } catch (error) {
      console.error('Error getting recent errors:', error);
      // Don't add this as an error since it's expected when no jobs exist
      if (!error.message?.includes('FAILED_PRECONDITION')) {
        stats.errors.push({
          jobId: 'system',
          error: `Failed to get recent errors: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        });
      }
    }

    // Calculate average processing time from completed jobs using Admin SDK
    // Skip this query if no jobs exist to avoid index requirements
    try {
      // First check if collection exists and has any documents
      const collectionSnapshot = await adminDb.collection('credit_refresh_jobs').limit(1).get();
      
      if (collectionSnapshot.empty) {
        // No jobs exist yet, skip processing time calculation
        console.log('No credit refresh jobs found, skipping processing time calculation');
      } else {
        // Only query for completed jobs if jobs exist
        const completedSnapshot = await adminDb.collection('credit_refresh_jobs')
          .where('status', '==', 'completed')
          .limit(100) // Remove orderBy to avoid index requirement
          .get();
        
        let totalProcessingTime = 0;
        let processingTimeCount = 0;
        
        completedSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.createdAt && data.result?.timestamp) {
            const created = data.createdAt.toDate();
            const completed = new Date(data.result.timestamp);
            const processingTime = completed.getTime() - created.getTime();
            totalProcessingTime += processingTime;
            processingTimeCount++;
          }
        });
        
        if (processingTimeCount > 0) {
          stats.averageProcessingTime = totalProcessingTime / processingTimeCount;
        }
      }
    } catch (error) {
      console.error('Error calculating processing time:', error);
      // Don't add this as an error since it's expected when no jobs exist
      if (!error.message?.includes('FAILED_PRECONDITION')) {
        stats.errors.push({
          jobId: 'system',
          error: `Failed to calculate processing time: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        });
      }
    }

    // Get last run time from most recent completed job
    if (stats.recentActivity.length > 0) {
      const lastCompleted = stats.recentActivity.find(activity => activity.status === 'completed');
      if (lastCompleted) {
        stats.lastRunTime = lastCompleted.timestamp;
      }
    }

    // Calculate next scheduled run (next midnight)
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    stats.nextScheduledRun = nextMidnight;

    console.log(`✅ Credit refresh monitoring stats generated: ${stats.totalJobs} total jobs, ${stats.successRate.toFixed(1)}% success rate`);

    return NextResponse.json({
      success: true,
      message: 'Credit refresh monitoring stats generated',
      stats,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating credit refresh monitoring stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate monitoring stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
