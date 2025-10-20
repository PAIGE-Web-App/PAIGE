import { NextRequest, NextResponse } from 'next/server';
import { creditServiceAdmin } from '@/lib/creditServiceAdmin';
import { adminDb } from '@/lib/firebaseAdmin';

interface CreditRefreshMetrics {
  totalUsers: number;
  processedUsers: number;
  refreshedUsers: number;
  skippedUsers: number;
  failedUsers: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  errors: Array<{userId: string, error: string}>;
  batchNumber: number;
  cursor?: string;
  hasMore: boolean;
}

// Circuit breaker pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    return this.failures >= this.threshold && 
           Date.now() - this.lastFailureTime < this.timeout;
  }

  private onSuccess(): void {
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}

// Retry logic with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>, 
  maxRetries = 3, 
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export async function POST(request: NextRequest) {
  const circuitBreaker = new CircuitBreaker();
  const metrics: CreditRefreshMetrics = {
    totalUsers: 0,
    processedUsers: 0,
    refreshedUsers: 0,
    skippedUsers: 0,
    failedUsers: 0,
    startTime: new Date(),
    errors: [],
    batchNumber: 0,
    hasMore: false
  };

  try {
    // Verify this is a legitimate scheduled task call or admin request
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SCHEDULED_TASK_SECRET;
    
    // Check if it's a scheduled task call
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
        const { adminAuth, adminDb } = await import('@/lib/firebaseAdmin');
        const decodedToken = await adminAuth.verifyIdToken(adminToken);
        
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

    // Parse request body for pagination
    const body = await request.json().catch(() => ({}));
    const { cursor, batchSize = 50, isInitialRun = false } = body;

    console.log(`🔄 Starting credit refresh batch: cursor=${cursor}, batchSize=${batchSize}, isInitialRun=${isInitialRun}`);

    // Build query with cursor-based pagination
    let query = adminDb.collection('users')
      .where('credits', '!=', null)
      .limit(batchSize);

    // Add cursor if provided
    if (cursor) {
      const cursorDoc = await adminDb.collection('users').doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    // Execute query with circuit breaker
    const usersSnapshot = await circuitBreaker.execute(() => query.get());

    if (usersSnapshot.empty) {
      console.log('✅ No users found with credits to refresh');
      metrics.endTime = new Date();
      metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
      
      return NextResponse.json({ 
        success: true, 
        message: 'No users found with credits to refresh',
        metrics,
        hasMore: false
      });
    }

    const users = usersSnapshot.docs;
    const lastDoc = users[users.length - 1];
    metrics.totalUsers = users.length;
    metrics.hasMore = users.length === batchSize;

    console.log(`📊 Processing ${users.length} users in batch`);

    // Process users with retry logic
    const batchPromises = users.map(async (userDoc) => {
      return withRetry(async () => {
        try {
          const userId = userDoc.id;
          const userData = userDoc.data();
          const userCredits = userData.credits;

          if (!userCredits) {
            return { success: false, error: 'No credits found', userId };
          }

          // Check if credits need refresh
          const lastRefresh = new Date(userCredits.lastCreditRefresh);
          const now = new Date();
          
          // Check if we've crossed midnight since last refresh
          const lastRefreshDay = new Date(lastRefresh.getFullYear(), lastRefresh.getMonth(), lastRefresh.getDate());
          const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          if (currentDay > lastRefreshDay) {
            // Credits need refresh - only refresh if it's actually a new day
            console.log(`🔄 Refreshing credits for user ${userId} (${userData.email}) - last refresh: ${lastRefreshDay.toDateString()}, current: ${currentDay.toDateString()}`);
            
            await circuitBreaker.execute(() => 
              creditServiceAdmin.refreshCreditsForUser(userId, userCredits)
            );
            
            return { success: true, refreshed: true, userId };
          } else {
            // No refresh needed - same day
            console.log(`⏭️ Skipping user ${userId} (${userData.email}) - already refreshed today`);
            return { success: true, skipped: true, userId };
          }
        } catch (error) {
          console.error(`❌ Error refreshing credits for user ${userDoc.id}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, error: errorMessage, userId: userDoc.id };
        }
      });
    });

    const batchResults = await Promise.all(batchPromises);
    
    // Process results and update metrics
    batchResults.forEach(result => {
      metrics.processedUsers++;
      
      if (result.success && result.refreshed) {
        metrics.refreshedUsers++;
      } else if (result.success && result.skipped) {
        metrics.skippedUsers++;
      } else if (!result.success) {
        metrics.failedUsers++;
        if (result.error) {
          metrics.errors.push({ userId: result.userId, error: result.error });
        }
      }
    });

    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    metrics.cursor = lastDoc.id;

    console.log(`✅ Credit refresh batch completed: ${metrics.refreshedUsers} refreshed, ${metrics.skippedUsers} skipped, ${metrics.failedUsers} failed`);

    return NextResponse.json({
      success: true,
      message: 'Credit refresh batch completed',
      metrics,
      hasMore: metrics.hasMore,
      nextCursor: metrics.hasMore ? lastDoc.id : null
    });

  } catch (error) {
    console.error('❌ Error in credit refresh:', error);
    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    
    return NextResponse.json(
      { 
        error: 'Failed to refresh credits',
        details: error instanceof Error ? error.message : 'Unknown error',
        metrics
      },
      { status: 500 }
    );
  }
}
