// Safe read reduction for budget system
// This reduces Firestore reads by adding intelligent caching and deduplication

import { useRef, useCallback, useEffect } from 'react';
import { safeBudgetCache } from './useBudgetSafeCache';

interface ReadReductionConfig {
  enableCaching?: boolean;
  enableDeduplication?: boolean;
  enableRateLimiting?: boolean;
  cacheTTL?: number;
  rateLimitMs?: number;
}

// Hook to reduce redundant reads in budget system
export function useBudgetReadReducer(
  userId: string | null,
  config: ReadReductionConfig = {}
) {
  const {
    enableCaching = true,
    enableDeduplication = true,
    enableRateLimiting = true,
    cacheTTL = 30000, // 30 seconds
    rateLimitMs = 1000 // 1 second
  } = config;

  const pendingReads = useRef(new Map<string, Promise<any>>());
  const lastReadTimes = useRef(new Map<string, number>());
  const readCounts = useRef(new Map<string, number>());

  // Track read reduction metrics
  const metrics = useRef({
    totalReads: 0,
    cacheHits: 0,
    deduplicatedReads: 0,
    rateLimitedReads: 0
  });

  // Optimized read function
  const optimizedRead = useCallback(async <T>(
    readKey: string,
    readFunction: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<T> => {
    if (!userId) throw new Error('User ID required for optimized read');

    const fullKey = `budget_${userId}_${readKey}`;
    const now = Date.now();

    metrics.current.totalReads++;

    // Check cache first
    if (enableCaching && !forceRefresh && safeBudgetCache.has(fullKey)) {
      metrics.current.cacheHits++;
      return safeBudgetCache.get<T>(fullKey)!;
    }

    // Check if read is already pending (deduplication)
    if (enableDeduplication && pendingReads.current.has(fullKey)) {
      metrics.current.deduplicatedReads++;
      return pendingReads.current.get(fullKey)!;
    }

    // Check rate limiting
    if (enableRateLimiting) {
      const lastRead = lastReadTimes.current.get(fullKey);
      if (lastRead && (now - lastRead) < rateLimitMs) {
        metrics.current.rateLimitedReads++;
        if (safeBudgetCache.has(fullKey)) {
          return safeBudgetCache.get<T>(fullKey)!;
        }
      }
    }

    // Execute read
    const readPromise = readFunction().then(result => {
      // Cache the result
      if (enableCaching) {
        safeBudgetCache.set(fullKey, result, cacheTTL);
      }
      
      // Update tracking
      lastReadTimes.current.set(fullKey, now);
      const currentCount = readCounts.current.get(fullKey) || 0;
      readCounts.current.set(fullKey, currentCount + 1);
      
      // Remove from pending
      pendingReads.current.delete(fullKey);
      
      return result;
    }).catch(error => {
      // Remove from pending on error
      pendingReads.current.delete(fullKey);
      throw error;
    });

    // Store pending read
    if (enableDeduplication) {
      pendingReads.current.set(fullKey, readPromise);
    }

    return readPromise;
  }, [userId, enableCaching, enableDeduplication, enableRateLimiting, cacheTTL, rateLimitMs]);

  // Batch multiple reads
  const batchReads = useCallback(async <T>(
    reads: Array<{ key: string; readFunction: () => Promise<T> }>
  ): Promise<T[]> => {
    const promises = reads.map(({ key, readFunction }) => 
      optimizedRead(key, readFunction)
    );
    
    return Promise.all(promises);
  }, [optimizedRead]);

  // Clear cache and reset metrics
  const clearCache = useCallback(() => {
    if (userId) {
      safeBudgetCache.clearUser(userId);
      pendingReads.current.clear();
      lastReadTimes.current.clear();
      readCounts.current.clear();
      
      // Reset metrics
      metrics.current = {
        totalReads: 0,
        cacheHits: 0,
        deduplicatedReads: 0,
        rateLimitedReads: 0
      };
    }
  }, [userId]);

  // Get read reduction metrics
  const getMetrics = useCallback(() => {
    const { totalReads, cacheHits, deduplicatedReads, rateLimitedReads } = metrics.current;
    
    return {
      totalReads,
      cacheHits,
      deduplicatedReads,
      rateLimitedReads,
      cacheHitRate: totalReads > 0 ? (cacheHits / totalReads) * 100 : 0,
      deduplicationRate: totalReads > 0 ? (deduplicatedReads / totalReads) * 100 : 0,
      rateLimitRate: totalReads > 0 ? (rateLimitedReads / totalReads) * 100 : 0,
      pendingReads: pendingReads.current.size
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pendingReads.current.clear();
      lastReadTimes.current.clear();
      readCounts.current.clear();
    };
  }, []);

  return {
    optimizedRead,
    batchReads,
    clearCache,
    getMetrics
  };
}

// Utility to create read keys
export function createReadKey(
  collection: string,
  params: Record<string, any> = {}
): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  
  return `${collection}_${sortedParams}`;
}