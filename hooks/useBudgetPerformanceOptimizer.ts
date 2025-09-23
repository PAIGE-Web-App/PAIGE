// Performance optimization hook for budget system
// This reduces Firestore reads and improves performance without breaking changes

import { useRef, useCallback, useEffect } from 'react';
import { budgetCache } from './useBudgetCache';

interface PerformanceOptimizationConfig {
  enableCaching?: boolean;
  enableDeduplication?: boolean;
  enableRateLimiting?: boolean;
  cacheTTL?: number;
  rateLimitMs?: number;
}

// Hook to add performance optimizations to existing budget hooks
export function useBudgetPerformanceOptimizer(
  userId: string | null,
  config: PerformanceOptimizationConfig = {}
) {
  const {
    enableCaching = true,
    enableDeduplication = true,
    enableRateLimiting = true,
    cacheTTL = 30000, // 30 seconds
    rateLimitMs = 1000 // 1 second
  } = config;

  const pendingOperations = useRef(new Map<string, Promise<any>>());
  const lastOperationTimes = useRef(new Map<string, number>());
  const operationCounts = useRef(new Map<string, number>());

  // Track performance metrics
  const metrics = useRef({
    totalOperations: 0,
    cacheHits: 0,
    deduplicatedOperations: 0,
    rateLimitedOperations: 0
  });

  // Optimized operation function
  const optimizedOperation = useCallback(async <T>(
    operationKey: string,
    operationFunction: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<T> => {
    if (!userId) throw new Error('User ID required for optimized operation');

    const fullKey = `budget_${userId}_${operationKey}`;
    const now = Date.now();

    metrics.current.totalOperations++;

    // Check cache first
    if (enableCaching && !forceRefresh && budgetCache.has(fullKey)) {
      metrics.current.cacheHits++;
      return budgetCache.get<T>(fullKey)!;
    }

    // Check if operation is already pending (deduplication)
    if (enableDeduplication && pendingOperations.current.has(fullKey)) {
      metrics.current.deduplicatedOperations++;
      return pendingOperations.current.get(fullKey)!;
    }

    // Check rate limiting
    if (enableRateLimiting) {
      const lastOperation = lastOperationTimes.current.get(fullKey);
      if (lastOperation && (now - lastOperation) < rateLimitMs) {
        metrics.current.rateLimitedOperations++;
        if (budgetCache.has(fullKey)) {
          return budgetCache.get<T>(fullKey)!;
        }
      }
    }

    // Execute operation
    const operationPromise = operationFunction().then(result => {
      // Cache the result
      if (enableCaching) {
        budgetCache.set(fullKey, result, cacheTTL);
      }
      
      // Update tracking
      lastOperationTimes.current.set(fullKey, now);
      const currentCount = operationCounts.current.get(fullKey) || 0;
      operationCounts.current.set(fullKey, currentCount + 1);
      
      // Remove from pending
      pendingOperations.current.delete(fullKey);
      
      return result;
    }).catch(error => {
      // Remove from pending on error
      pendingOperations.current.delete(fullKey);
      throw error;
    });

    // Store pending operation
    if (enableDeduplication) {
      pendingOperations.current.set(fullKey, operationPromise);
    }

    return operationPromise;
  }, [userId, enableCaching, enableDeduplication, enableRateLimiting, cacheTTL, rateLimitMs]);

  // Batch multiple operations
  const batchOperations = useCallback(async <T>(
    operations: Array<{ key: string; operation: () => Promise<T> }>
  ): Promise<T[]> => {
    const promises = operations.map(({ key, operation }) => 
      optimizedOperation(key, operation)
    );
    
    return Promise.all(promises);
  }, [optimizedOperation]);

  // Clear cache and reset metrics
  const clearCache = useCallback(() => {
    if (userId) {
      budgetCache.clearUser(userId);
      pendingOperations.current.clear();
      lastOperationTimes.current.clear();
      operationCounts.current.clear();
      
      // Reset metrics
      metrics.current = {
        totalOperations: 0,
        cacheHits: 0,
        deduplicatedOperations: 0,
        rateLimitedOperations: 0
      };
    }
  }, [userId]);

  // Get performance metrics
  const getMetrics = useCallback(() => {
    const { totalOperations, cacheHits, deduplicatedOperations, rateLimitedOperations } = metrics.current;
    
    return {
      totalOperations,
      cacheHits,
      deduplicatedOperations,
      rateLimitedOperations,
      cacheHitRate: totalOperations > 0 ? (cacheHits / totalOperations) * 100 : 0,
      deduplicationRate: totalOperations > 0 ? (deduplicatedOperations / totalOperations) * 100 : 0,
      rateLimitRate: totalOperations > 0 ? (rateLimitedOperations / totalOperations) * 100 : 0,
      pendingOperations: pendingOperations.current.size,
      cacheSize: budgetCache['cache'].size
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pendingOperations.current.clear();
      lastOperationTimes.current.clear();
      operationCounts.current.clear();
    };
  }, []);

  return {
    optimizedOperation,
    batchOperations,
    clearCache,
    getMetrics
  };
}

// Utility to create operation keys
export function createOperationKey(
  operation: string,
  params: Record<string, any> = {}
): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  
  return `${operation}_${sortedParams}`;
}

// Utility to optimize existing useEffect hooks
export function createOptimizedEffect(
  dependencies: any[],
  effectFunction: () => void | (() => void),
  options: { 
    debounceMs?: number;
    enableCaching?: boolean;
    cacheKey?: string;
  } = {}
) {
  const { debounceMs = 0, enableCaching = false, cacheKey } = options;
  
  return {
    dependencies,
    effectFunction,
    debounceMs,
    enableCaching,
    cacheKey
  };
}
