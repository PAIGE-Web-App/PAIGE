// Safe read optimization for budget system
// This reduces Firestore reads by adding intelligent caching and deduplication

import { useRef, useCallback } from 'react';
import { safeBudgetCache } from './useBudgetSafeCache';

interface ReadOptimizationOptions {
  enableCaching?: boolean;
  enableDeduplication?: boolean;
  cacheTTL?: number;
}

// Hook to optimize budget data reads
export function useBudgetReadOptimizer(
  userId: string | null,
  options: ReadOptimizationOptions = {}
) {
  const {
    enableCaching = true,
    enableDeduplication = true,
    cacheTTL = 30000
  } = options;

  const pendingReads = useRef(new Map<string, Promise<any>>());

  // Optimized read function with caching and deduplication
  const optimizedRead = useCallback(async <T>(
    key: string,
    readFunction: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<T> => {
    if (!userId) throw new Error('User ID required for optimized read');

    const fullKey = `budget_${userId}_${key}`;

    // Check cache first
    if (enableCaching && !forceRefresh && safeBudgetCache.has(fullKey)) {
      return safeBudgetCache.get<T>(fullKey)!;
    }

    // Check if read is already pending (deduplication)
    if (enableDeduplication && pendingReads.current.has(fullKey)) {
      return pendingReads.current.get(fullKey)!;
    }

    // Execute read
    const readPromise = readFunction().then(result => {
      // Cache the result
      if (enableCaching) {
        safeBudgetCache.set(fullKey, result, cacheTTL);
      }
      
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
  }, [userId, enableCaching, enableDeduplication, cacheTTL]);

  // Batch multiple reads together
  const batchRead = useCallback(async <T>(
    reads: Array<{ key: string; readFunction: () => Promise<T> }>
  ): Promise<T[]> => {
    const promises = reads.map(({ key, readFunction }) => 
      optimizedRead(key, readFunction)
    );
    
    return Promise.all(promises);
  }, [optimizedRead]);

  // Clear cache for current user
  const clearUserCache = useCallback(() => {
    if (userId) {
      safeBudgetCache.clearUser(userId);
      pendingReads.current.clear();
    }
  }, [userId]);

  return {
    optimizedRead,
    batchRead,
    clearUserCache
  };
}

// Utility to create consistent cache keys
export function createBudgetCacheKey(
  userId: string,
  collection: string,
  params: Record<string, any> = {}
): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  
  return `${collection}_${sortedParams}`;
}