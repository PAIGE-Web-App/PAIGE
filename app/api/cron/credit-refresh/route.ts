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
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token');
    const expectedToken = process.env.CRON_SECRET || process.env.SCHEDULED_TASK_SECRET;
    
    if (!expectedToken) {
      console.error('❌ CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Check both Authorization header and query parameter for flexibility
    const isValidAuth = 
      (authHeader && authHeader === `Bearer ${expectedToken}`) ||
      (queryToken && queryToken === expectedToken);

    if (!isValidAuth) {
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
    // Handle both health check and cron execution for external services
    // Some cron services might send GET requests instead of POST
    
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token');
    const expectedToken = process.env.CRON_SECRET || process.env.SCHEDULED_TASK_SECRET;
    
    // Check both Authorization header and query parameter for flexibility
    const isValidAuth = 
      (authHeader && expectedToken && authHeader === `Bearer ${expectedToken}`) ||
      (queryToken && queryToken === expectedToken);
    
    // If authorization is present, treat as cron execution
    if (isValidAuth) {
      console.log('🔄 Starting credit refresh via external cron (GET request)...');
      
      const result = await refreshAllUserCredits();
      
      if (result.success) {
        console.log('✅ Credit refresh completed successfully (GET)');
        return NextResponse.json({
          success: true,
          message: 'Credit refresh completed successfully',
          ...result
        });
      } else {
        console.error('❌ Credit refresh failed (GET)');
        return NextResponse.json({
          success: false,
          message: 'Credit refresh failed',
          ...result
        }, { status: 500 });
      }
    }
    
    // Otherwise, return health check
    const health = await healthCheck();
    
    return NextResponse.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      ...health
    });

  } catch (error) {
    console.error('❌ Error in GET endpoint:', error);
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
