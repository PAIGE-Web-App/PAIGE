import { NextRequest, NextResponse } from 'next/server';
import { aiPerformanceMonitor } from '@/lib/aiPerformanceMonitor';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');
    
    const stats = aiPerformanceMonitor.getStats(endpoint || undefined);
    const slowestOps = aiPerformanceMonitor.getSlowestOperations(5);
    
    return NextResponse.json({
      success: true,
      stats,
      slowestOperations: slowestOps,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting AI performance stats:', error);
    return NextResponse.json(
      { error: 'Failed to get performance stats' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    aiPerformanceMonitor.clear();
    
    return NextResponse.json({
      success: true,
      message: 'Performance metrics cleared'
    });
  } catch (error) {
    console.error('Error clearing AI performance stats:', error);
    return NextResponse.json(
      { error: 'Failed to clear performance stats' },
      { status: 500 }
    );
  }
}
