// Minimal, safe optimization for budget system
// This reduces Firestore reads without changing existing functionality

import { useRef, useCallback } from 'react';
import { safeBudgetCache } from './useBudgetSafeCache';

interface MinimalOptimizationConfig {
  enableCaching?: boolean;
  enableDeduplication?: boolean;
  cacheTTL?: number;
}

// Hook to add minimal optimizations to existing budget hooks
export function useBudgetMinimalOptimization(
  userId: string | null,
  config: MinimalOptimizationConfig = {}
) {
  const {
    enableCaching = true,
    enableDeduplication = true,
    cacheTTL = 30000
  } = config;

  const pendingOperations = useRef(new Map<string, Promise<any>>());

  // Optimized operation function
  const optimizedOperation = useCallback(async <T>(
    operationKey: string,
    operation: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<T> => {
    if (!userId) return operation();

    const fullKey = `budget_${userId}_${operationKey}`;

    // Check cache first
    if (enableCaching && !forceRefresh && safeBudgetCache.has(fullKey)) {
      return safeBudgetCache.get<T>(fullKey)!;
    }

    // Check if operation is already pending (deduplication)
    if (enableDeduplication && pendingOperations.current.has(fullKey)) {
      return pendingOperations.current.get(fullKey)!;
    }

    // Execute operation
    const operationPromise = operation().then(result => {
      // Cache the result
      if (enableCaching) {
        safeBudgetCache.set(fullKey, result, cacheTTL);
      }
      
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
  }, [userId, enableCaching, enableDeduplication, cacheTTL]);

  // Clear cache
  const clearCache = useCallback(() => {
    if (userId) {
      safeBudgetCache.clearUser(userId);
      pendingOperations.current.clear();
    }
  }, [userId]);

  return {
    optimizedOperation,
    clearCache
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