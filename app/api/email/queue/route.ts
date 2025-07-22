// app/api/email/queue/route.ts
// Email queue API endpoint for background email sending

import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/utils/jobQueue';
import { Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, from, priority = 'normal', scheduledFor, userId } = await request.json();

    // Validate required fields
    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority level' },
        { status: 400 }
      );
    }

    // Create job data
    const jobData: any = {
      type: 'email' as const,
      priority,
      data: {
        to,
        subject,
        body,
        from: from || 'noreply@paige.app'
      },
      maxAttempts: 3,
      metadata: {
        source: 'email_queue_api',
        description: `Email to ${to}: ${subject}`,
        tags: ['email', 'communication']
      }
    };

    // Only add userId if provided
    if (userId) {
      jobData.userId = userId;
    }

    // Add scheduled time if provided
    if (scheduledFor) {
      jobData.scheduledFor = Timestamp.fromDate(new Date(scheduledFor));
    }

    // Add job to queue
    const jobId = await jobQueue.addJob(jobData);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Email queued successfully',
      estimatedDelivery: scheduledFor ? new Date(scheduledFor) : 'immediate'
    });

  } catch (error) {
    console.error('Email queue error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to queue email',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      // Get specific job status
      const job = await jobQueue.getJobStatus(jobId);
      
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        attempts: job.attempts,
        createdAt: job.createdAt.toDate(),
        updatedAt: job.updatedAt.toDate(),
        startedAt: job.startedAt?.toDate(),
        completedAt: job.completedAt?.toDate(),
        error: job.error,
        result: job.result
      });
    } else {
      // Get queue statistics
      const stats = await jobQueue.getQueueStats();
      
      return NextResponse.json({
        stats,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Email queue status error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get queue status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 