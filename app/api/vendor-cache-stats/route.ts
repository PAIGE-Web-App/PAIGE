import { NextRequest, NextResponse } from 'next/server';
import { vendorSearchCache } from '@/utils/vendorSearchCache';

export async function GET(request: NextRequest) {
  try {
    const stats = vendorSearchCache.getStats();
    const cacheSize = vendorSearchCache.getCacheSize();
    
    return NextResponse.json({
      success: true,
      stats,
      cacheSize,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get cache stats', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

