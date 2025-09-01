import { NextRequest, NextResponse } from 'next/server';
import { creditServiceAdmin } from '@/lib/creditServiceAdmin';
import { adminDb } from '@/lib/firebaseAdmin';
import { query, where, orderBy, limit, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

interface QueueJob {
  userId: string;
  email: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Timestamp;
  scheduledFor: Timestamp;
  attempts: number;
  maxAttempts: number;
  error?: string;
  result?: any;
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
  try {
    // Verify this is a legitimate scheduled task call
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SCHEDULED_TASK_SECRET;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Scheduled task access required' },
        { status: 401 }
      );
    }

    // Parse request body for worker configuration
    const body = await request.json().catch(() => ({}));
    const { maxJobs = 10, processTime = 30000 } = body; // Default: 10 jobs, 30 seconds

    console.log(`🔄 Starting credit refresh worker: maxJobs=${maxJobs}, processTime=${processTime}ms`);

    const startTime = Date.now();
    let processedJobs = 0;
    let successfulJobs = 0;
    let failedJobs = 0;
    const errors: Array<{jobId: string, error: string}> = [];

    // Process jobs until time limit or max jobs reached
    while (processedJobs < maxJobs && (Date.now() - startTime) < processTime) {
      try {
        // Get next pending job that's due for processing
        const now = Timestamp.now();
        const jobsQuery = query(
          adminDb.collection('credit_refresh_jobs'),
          where('status', '==', 'pending'),
          where('scheduledFor', '<=', now),
          orderBy('scheduledFor'),
          limit(1)
        );

        const jobsSnapshot = await getDocs(jobsQuery);

        if (jobsSnapshot.empty) {
          console.log('✅ No pending jobs to process');
          break;
        }

        const jobDoc = jobsSnapshot.docs[0];
        const jobData = jobDoc.data() as QueueJob;
        const jobId = jobDoc.id;

        console.log(`📋 Processing job ${jobId} for user ${jobData.email}`);

        // Mark job as processing
        await updateDoc(doc(adminDb, 'credit_refresh_jobs', jobId), {
          status: 'processing',
          attempts: jobData.attempts + 1
        });

        try {
          // Get user data
          const userDoc = await adminDb.collection('users').doc(jobData.userId).get();
          
          if (!userDoc.exists) {
            throw new Error('User not found');
          }

          const userData = userDoc.data();
          const userCredits = userData?.credits;

          if (!userCredits) {
            throw new Error('No credits found for user');
          }

          // Check if credits need refresh
          const lastRefresh = new Date(userCredits.lastCreditRefresh);
          const now = new Date();
          
          const lastRefreshDay = new Date(lastRefresh.getFullYear(), lastRefresh.getMonth(), lastRefresh.getDate());
          const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          if (currentDay > lastRefreshDay) {
            // Credits need refresh
            console.log(`🔄 Refreshing credits for user ${jobData.userId} (${jobData.email})`);
            
            await withRetry(() => 
              creditServiceAdmin.refreshCreditsForUser(jobData.userId, userCredits)
            );
            
            // Mark job as completed
            await updateDoc(doc(adminDb, 'credit_refresh_jobs', jobId), {
              status: 'completed',
              result: { refreshed: true, timestamp: now.toISOString() }
            });
            
            successfulJobs++;
            console.log(`✅ Successfully refreshed credits for ${jobData.email}`);
          } else {
            // No refresh needed
            console.log(`⏭️ Skipping user ${jobData.email} - already refreshed today`);
            
            await updateDoc(doc(adminDb, 'credit_refresh_jobs', jobId), {
              status: 'completed',
              result: { skipped: true, reason: 'Already refreshed today' }
            });
            
            successfulJobs++;
          }

        } catch (error) {
          console.error(`❌ Error processing job ${jobId}:`, error);
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ jobId, error: errorMessage });
          
          // Check if we should retry
          if (jobData.attempts < jobData.maxAttempts) {
            // Schedule retry with exponential backoff
            const retryDelay = Math.pow(2, jobData.attempts) * 60000; // 1min, 2min, 4min
            const retryTime = new Date(Date.now() + retryDelay);
            
            await updateDoc(doc(adminDb, 'credit_refresh_jobs', jobId), {
              status: 'pending',
              scheduledFor: Timestamp.fromDate(retryTime),
              error: errorMessage
            });
            
            console.log(`🔄 Scheduled retry for job ${jobId} in ${retryDelay/1000}s`);
          } else {
            // Max attempts reached, mark as failed
            await updateDoc(doc(adminDb, 'credit_refresh_jobs', jobId), {
              status: 'failed',
              error: errorMessage
            });
            
            failedJobs++;
            console.log(`💥 Job ${jobId} failed after ${jobData.maxAttempts} attempts`);
          }
        }

        processedJobs++;

        // Small delay between jobs to be nice to the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('❌ Error in worker loop:', error);
        // Continue processing other jobs
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Worker completed: ${processedJobs} jobs processed, ${successfulJobs} successful, ${failedJobs} failed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Credit refresh worker completed',
      metrics: {
        processedJobs,
        successfulJobs,
        failedJobs,
        duration,
        errors: errors.slice(0, 10) // Limit error messages
      }
    });

  } catch (error) {
    console.error('❌ Error in credit refresh worker:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process credit refresh jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
