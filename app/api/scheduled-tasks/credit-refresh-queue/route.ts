import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { writeBatch, doc, Timestamp } from 'firebase/firestore';

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

export async function POST(request: NextRequest) {
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

    console.log('🔄 Creating credit refresh queue jobs...');

    // Get all users with credits (using existing index)
    const usersSnapshot = await adminDb.collection('users')
      .where('credits', '!=', null)
      .select('id', 'email', 'credits')
      .get();

    if (usersSnapshot.empty) {
      console.log('✅ No users found with credits to queue');
      return NextResponse.json({ 
        success: true, 
        message: 'No users found with credits to queue',
        jobsCreated: 0
      });
    }

    const users = usersSnapshot.docs;
    console.log(`📊 Creating ${users.length} credit refresh jobs`);

    // Create jobs in batches to avoid overwhelming Firestore
    const batchSize = 500; // Firestore batch limit
    let totalJobsCreated = 0;
    const errors: string[] = [];

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = writeBatch(adminDb as any);
      const userBatch = users.slice(i, i + batchSize);

      userBatch.forEach(userDoc => {
        const userData = userDoc.data();
        const jobRef = doc(adminDb as any, 'credit_refresh_jobs', userDoc.id);
        
        // Calculate staggered refresh time based on user ID hash
        const hash = simpleHash(userDoc.id);
        const hourOffset = hash % 24; // Spread across 24 hours
        const minuteOffset = hash % 60; // Spread across minutes
        
        const scheduledTime = new Date();
        scheduledTime.setHours(hourOffset, minuteOffset, 0, 0);
        
        // If time has passed today, schedule for tomorrow
        if (scheduledTime < new Date()) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const job: QueueJob = {
          userId: userDoc.id,
          email: userData.email || 'unknown',
          status: 'pending',
          createdAt: Timestamp.now(),
          scheduledFor: Timestamp.fromDate(scheduledTime),
          attempts: 0,
          maxAttempts: 3
        };

        batch.set(jobRef, job);
      });

      try {
        await batch.commit();
        totalJobsCreated += userBatch.length;
        console.log(`✅ Created batch of ${userBatch.length} jobs (${totalJobsCreated}/${users.length} total)`);
      } catch (error) {
        console.error(`❌ Error creating batch ${Math.floor(i / batchSize) + 1}:`, error);
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Small delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Credit refresh queue created: ${totalJobsCreated} jobs created, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: 'Credit refresh queue created successfully',
      jobsCreated: totalJobsCreated,
      errors: errors.slice(0, 10) // Limit error messages
    });

  } catch (error) {
    console.error('❌ Error creating credit refresh queue:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create credit refresh queue',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Simple hash function for user ID
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
