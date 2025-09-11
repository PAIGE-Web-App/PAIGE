import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

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
    // Verify this is a legitimate request
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SCHEDULED_TASK_SECRET;
    
    // Check if it's a scheduled task call or admin request
    if (expectedToken && authHeader === `Bearer ${expectedToken}`) {
      // This is a scheduled task call - proceed
    } else {
      // This might be an admin request - verify admin token
      const adminToken = request.headers.get('authorization')?.replace('Bearer ', '');
      if (!adminToken) {
        return NextResponse.json(
          { error: 'Unauthorized - No token provided' },
          { status: 401 }
        );
      }
      
      // Verify the admin token with Firebase Admin and check user role
      try {
        const { admin, adminDb } = await import('@/lib/firebaseAdmin');
        const decodedToken = await admin.auth().verifyIdToken(adminToken);
        
        // Get user role from database
        const userRef = adminDb.collection('users').doc(decodedToken.uid);
        const userSnap = await userRef.get();
        
        if (!userSnap.exists) {
          return NextResponse.json(
            { error: 'Unauthorized - User not found' },
            { status: 404 }
          );
        }
        
        const userData = userSnap.data();
        const userRole = userData?.role || 'couple';
        
        // Check if user has admin privileges
        if (userRole !== 'admin' && userRole !== 'super_admin') {
          return NextResponse.json(
            { error: 'Unauthorized - Admin access required' },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error('Admin verification error:', error);
        return NextResponse.json(
          { error: 'Unauthorized - Invalid token' },
          { status: 401 }
        );
      }
    }

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

    // Get job statistics by status
    const statuses = ['pending', 'processing', 'completed', 'failed'] as const;
    
    for (const status of statuses) {
      const statusQuery = query(
        adminDb.collection('credit_refresh_jobs') as any,
        where('status', '==', status)
      );
      
      const statusSnapshot = await getDocs(statusQuery);
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
    }

    // Calculate success rate
    if (stats.totalJobs > 0) {
      stats.successRate = (stats.completedJobs / stats.totalJobs) * 100;
    }

    // Get recent activity (last 20 jobs)
    const recentQuery = query(
      adminDb.collection('credit_refresh_jobs') as any,
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const recentSnapshot = await getDocs(recentQuery);
    stats.recentActivity = recentSnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        jobId: doc.id,
        userId: data.userId,
        email: data.email,
        status: data.status,
        timestamp: data.createdAt?.toDate() || new Date(),
        result: data.result
      };
    });

    // Get recent errors (last 10 failed jobs)
    const errorsQuery = query(
      adminDb.collection('credit_refresh_jobs') as any,
      where('status', '==', 'failed'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const errorsSnapshot = await getDocs(errorsQuery);
    stats.errors = errorsSnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        jobId: doc.id,
        error: data.error || 'Unknown error',
        timestamp: data.createdAt?.toDate() || new Date()
      };
    });

    // Calculate average processing time from completed jobs
    const completedQuery = query(
      adminDb.collection('credit_refresh_jobs') as any,
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(100) // Sample last 100 completed jobs
    );
    
    const completedSnapshot = await getDocs(completedQuery);
    let totalProcessingTime = 0;
    let processingTimeCount = 0;
    
    completedSnapshot.docs.forEach(doc => {
      const data = doc.data() as any;
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
