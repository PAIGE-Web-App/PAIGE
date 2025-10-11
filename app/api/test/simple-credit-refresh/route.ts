/**
 * Test endpoint for simple credit refresh system
 * Use this to test the new system before setting up external cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAllUserCredits, healthCheck } from '@/lib/simpleCreditRefresh';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing simple credit refresh system...');
    
    // Run health check first
    const health = await healthCheck();
    console.log('🏥 Health check:', health);
    
    if (!health.healthy) {
      return NextResponse.json({
        success: false,
        error: 'System unhealthy',
        health
      }, { status: 500 });
    }

    // Run credit refresh
    const result = await refreshAllUserCredits();
    
    return NextResponse.json({
      success: true,
      message: 'Test completed',
      health,
      ...result
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      message: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const health = await healthCheck();
    return NextResponse.json({
      message: 'Simple credit refresh test endpoint',
      health
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
