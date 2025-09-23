// Safe optimization wrapper for existing budget hooks
// This reduces Firestore reads without changing existing functionality

import { useEffect, useRef } from 'react';
import { budgetQueryOptimizer } from './useBudgetQueryOptimizer';

interface OptimizationConfig {
  enableQueryDebouncing?: boolean;
  enableResultCaching?: boolean;
  cacheTTL?: number;
  debounceMs?: number;
}

// Hook to add safe optimizations to existing budget hooks
export function useBudgetSafeOptimization(
  userId: string | null,
  config: OptimizationConfig = {}
) {
  const {
    enableQueryDebouncing = true,
    enableResultCaching = true,
    cacheTTL = 30000,
    debounceMs = 100
  } = config;

  const optimizationRef = useRef({
    lastUserId: null as string | null,
    queryCount: 0,
    cacheHits: 0
  });

  // Track optimization metrics
  useEffect(() => {
    if (userId && userId !== optimizationRef.current.lastUserId) {
      // Clear cache when user changes
      budgetQueryOptimizer.clearUserCache(userId);
      optimizationRef.current.lastUserId = userId;
      optimizationRef.current.queryCount = 0;
      optimizationRef.current.cacheHits = 0;
    }
  }, [userId]);

  // Return optimization utilities
  return {
    // Debounced query function
    debouncedQuery: <T>(key: string, queryFn: () => Promise<T>) => {
      if (!enableQueryDebouncing) return queryFn();
      
      optimizationRef.current.queryCount++;
      return budgetQueryOptimizer.debounceQuery(key, queryFn, debounceMs);
    },

    // Cached query function
    cachedQuery: <T>(key: string, queryFn: () => Promise<T>) => {
      if (!enableResultCaching) return queryFn();
      
      return budgetQueryOptimizer.cachedQuery(key, queryFn, {
        enableCache: enableResultCaching,
        cacheTTL
      });
    },

    // Batch operations
    batchOperations: budgetQueryOptimizer.batchOperations.bind(budgetQueryOptimizer),

    // Clear cache
    clearCache: () => budgetQueryOptimizer.clearUserCache(userId || ''),

    // Get optimization metrics
    getMetrics: () => ({
      queryCount: optimizationRef.current.queryCount,
      cacheHits: optimizationRef.current.cacheHits,
      cacheHitRate: optimizationRef.current.queryCount > 0 
        ? (optimizationRef.current.cacheHits / optimizationRef.current.queryCount) * 100 
        : 0
    })
  };
}

// Utility to create optimized query keys
export function createBudgetQueryKey(
  userId: string,
  collection: string,
  additionalParams: Record<string, any> = {}
): string {
  const params = Object.entries(additionalParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  
  return `budget_${userId}_${collection}_${params}`;
}

// Utility to optimize existing onSnapshot listeners
export function optimizeSnapshotListener<T>(
  queryKey: string,
  snapshotCallback: (data: T) => void,
  errorCallback?: (error: any) => void
) {
  let lastData: T | null = null;
  let isSubscribed = true;

  return {
    onSnapshot: (data: T) => {
      if (!isSubscribed) return;
      
      // Only update if data actually changed
      if (JSON.stringify(data) !== JSON.stringify(lastData)) {
        lastData = data;
        snapshotCallback(data);
      }
    },
    
    onError: (error: any) => {
      if (!isSubscribed) return;
      errorCallback?.(error);
    },
    
    unsubscribe: () => {
      isSubscribed = false;
    }
  };
}
