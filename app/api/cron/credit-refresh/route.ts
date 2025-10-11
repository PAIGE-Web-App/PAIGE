/**
 * Simple Credit Refresh API Endpoint
 * Designed to be called by external cron services like cron-job.org
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAllUserCredits, healthCheck } from '@/lib/simpleCreditRefresh';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || process.env.SCHEDULED_TASK_SECRET;
    
    if (!expectedToken) {
      console.error('❌ CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
      console.error('❌ Invalid cron authorization');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting credit refresh via external cron...');
    
    const result = await refreshAllUserCredits();
    
    if (result.success) {
      console.log('✅ Credit refresh completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Credit refresh completed successfully',
        ...result
      });
    } else {
      console.error('❌ Credit refresh failed');
      return NextResponse.json({
        success: false,
        message: 'Credit refresh failed',
        ...result
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Critical error in credit refresh API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Health check endpoint
    const health = await healthCheck();
    
    return NextResponse.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      ...health
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
