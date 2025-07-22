// app/api/jobs/status/route.ts
// Job monitoring API endpoint for tracking background job performance

import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/utils/jobQueue';
import { scheduledTaskManager } from '@/utils/scheduledTasks';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const includeScheduled = searchParams.get('includeScheduled') === 'true';

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
        type: job.type,
        status: job.status,
        priority: job.priority,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        createdAt: job.createdAt.toDate(),
        updatedAt: job.updatedAt.toDate(),
        startedAt: job.startedAt?.toDate(),
        completedAt: job.completedAt?.toDate(),
        scheduledFor: job.scheduledFor?.toDate(),
        error: job.error,
        result: job.result,
        userId: job.userId,
        metadata: job.metadata
      });
    }

    // Get comprehensive system status
    const [queueStats, scheduledTasks] = await Promise.all([
      jobQueue.getQueueStats(),
      includeScheduled ? scheduledTaskManager.getTasks() : []
    ]);

    const systemStatus = {
      queue: {
        stats: queueStats,
        health: getQueueHealth(queueStats),
        timestamp: new Date().toISOString()
      },
      scheduled: includeScheduled ? {
        tasks: scheduledTasks.map(task => ({
          id: task.id,
          name: task.name,
          description: task.description,
          cronExpression: task.cronExpression,
          isActive: task.isActive,
          lastRun: task.lastRun,
          nextRun: task.nextRun,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        })),
        activeTasks: scheduledTasks.filter(t => t.isActive).length,
        totalTasks: scheduledTasks.length
      } : undefined,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(systemStatus);

  } catch (error) {
    console.error('Job status error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get job status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Determine queue health based on statistics
 */
function getQueueHealth(stats: any): {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for failed jobs
  if (stats.failed > 10) {
    issues.push(`High number of failed jobs: ${stats.failed}`);
    recommendations.push('Review failed jobs and check error logs');
  }

  // Check for stuck processing jobs
  if (stats.processing > 20) {
    issues.push(`High number of processing jobs: ${stats.processing}`);
    recommendations.push('Check for stuck jobs or slow processors');
  }

  // Check for large pending queue
  if (stats.pending > 100) {
    issues.push(`Large pending queue: ${stats.pending} jobs`);
    recommendations.push('Consider scaling up job processors');
  }

  // Check for retrying jobs
  if (stats.retrying > 5) {
    issues.push(`Jobs retrying: ${stats.retrying}`);
    recommendations.push('Review retry logic and error handling');
  }

  // Determine overall status
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  
  if (issues.length > 2) {
    status = 'critical';
  } else if (issues.length > 0) {
    status = 'warning';
  }

  return {
    status,
    issues,
    recommendations
  };
}

export async function POST(request: NextRequest) {
  try {
    const { action, jobId, taskId } = await request.json();

    switch (action) {
      case 'retry_job':
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID required for retry action' },
            { status: 400 }
          );
        }
        
        // Get the failed job and retry it
        const job = await jobQueue.getJobStatus(jobId);
        if (!job) {
          return NextResponse.json(
            { error: 'Job not found' },
            { status: 404 }
          );
        }

        if (job.status !== 'failed') {
          return NextResponse.json(
            { error: 'Only failed jobs can be retried' },
            { status: 400 }
          );
        }

        // Add a new job with the same data
        const retryJobId = await jobQueue.addJob({
          type: job.type,
          priority: job.priority,
          data: job.data,
          maxAttempts: job.maxAttempts,
          scheduledFor: job.scheduledFor,
          userId: job.userId,
          metadata: {
            ...job.metadata,
            source: 'manual_retry',
            originalJobId: job.id
          } as any
        });

        return NextResponse.json({
          success: true,
          message: 'Job queued for retry',
          originalJobId: jobId,
          retryJobId
        });

      case 'cancel_job':
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID required for cancel action' },
            { status: 400 }
          );
        }

        // Mark job as cancelled (implement in job queue)
        // For now, we'll just return success
        return NextResponse.json({
          success: true,
          message: 'Job cancellation requested',
          jobId
        });

      case 'toggle_scheduled_task':
        if (!taskId) {
          return NextResponse.json(
            { error: 'Task ID required for toggle action' },
            { status: 400 }
          );
        }

        const task = scheduledTaskManager.getTask(taskId);
        if (!task) {
          return NextResponse.json(
            { error: 'Scheduled task not found' },
            { status: 404 }
          );
        }

        const newActiveState = !task.isActive;
        scheduledTaskManager.setTaskActive(taskId, newActiveState);

        return NextResponse.json({
          success: true,
          message: `Scheduled task ${newActiveState ? 'enabled' : 'disabled'}`,
          taskId,
          isActive: newActiveState
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Job action error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to perform job action',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 