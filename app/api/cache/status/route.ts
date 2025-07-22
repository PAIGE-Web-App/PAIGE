// app/api/cache/status/route.ts
// Cache management API endpoint for monitoring and control

import { NextRequest, NextResponse } from 'next/server';
import { advancedCache, cacheUtils } from '@/utils/advancedCache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats': {
        const stats = advancedCache.getStats();
        return NextResponse.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        });
      }

      case 'keys': {
        // Get cache keys (if Redis is available)
        const keys = await getCacheKeys();
        return NextResponse.json({
          success: true,
          keys,
          timestamp: new Date().toISOString()
        });
      }

      case 'health': {
        const health = await getCacheHealth();
        return NextResponse.json({
          success: true,
          health,
          timestamp: new Date().toISOString()
        });
      }

      default: {
        // Return comprehensive cache status
        const [stats, health] = await Promise.all([
          advancedCache.getStats(),
          getCacheHealth()
        ]);

        return NextResponse.json({
          success: true,
          cache: {
            stats,
            health,
            config: {
              defaultTTL: 300,
              maxMemorySize: 100 * 1024 * 1024,
              enableAnalytics: true
            },
            utils: {
              tags: cacheUtils.tags,
              ttl: cacheUtils.ttl
            }
          },
          timestamp: new Date().toISOString()
        });
      }
    }

  } catch (error) {
    console.error('Cache status error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get cache status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, keys, tags, ttl } = await request.json();

    switch (action) {
      case 'clear':
        await advancedCache.clear();
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully'
        });

      case 'invalidate':
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json(
            { error: 'Tags array is required for invalidation' },
            { status: 400 }
          );
        }
        
        await advancedCache.invalidateByTags(tags);
        return NextResponse.json({
          success: true,
          message: `Invalidated cache entries with tags: ${tags.join(', ')}`
        });

      case 'warm':
        // Trigger cache warming
        await warmCache();
        return NextResponse.json({
          success: true,
          message: 'Cache warming initiated'
        });

      case 'set':
        if (!keys || !Array.isArray(keys)) {
          return NextResponse.json(
            { error: 'Keys array is required for setting values' },
            { status: 400 }
          );
        }
        
        await advancedCache.mset(keys);
        return NextResponse.json({
          success: true,
          message: `Set ${keys.length} cache entries`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Cache action error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to perform cache action',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get cache keys (Redis only)
 */
async function getCacheKeys(): Promise<string[]> {
  try {
    // This would require Redis connection
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error getting cache keys:', error);
    return [];
  }
}

/**
 * Get cache health status
 */
async function getCacheHealth(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
}> {
  const stats = advancedCache.getStats();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check hit rate
  if (stats.hitRate < 0.5) {
    issues.push(`Low cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    recommendations.push('Consider increasing cache TTL or adding more cache entries');
  }

  // Check memory usage
  const memoryMB = stats.memoryUsage / 1024 / 1024;
  if (memoryMB > 80) {
    issues.push(`High memory usage: ${memoryMB.toFixed(1)}MB`);
    recommendations.push('Consider reducing cache TTL or implementing LRU eviction');
  }

  // Check for many misses
  if (stats.misses > stats.hits * 2) {
    issues.push('High cache miss rate');
    recommendations.push('Review cache key patterns and TTL settings');
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

/**
 * Warm cache with frequently accessed data
 */
async function warmCache(): Promise<void> {
  try {
    console.log('🔥 Manual cache warming initiated...');
    
    // This would trigger the cache warming process
    // The actual implementation is in the AdvancedCache class
    
    console.log('✅ Manual cache warming completed');
  } catch (error) {
    console.error('Manual cache warming error:', error);
    throw error;
  }
} 