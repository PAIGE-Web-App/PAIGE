// Safe caching optimization for budget system
// This reduces Firestore reads without changing existing functionality

import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SafeBudgetCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 30000; // 30 seconds

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  clearUser(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(userId));
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

const safeBudgetCache = new SafeBudgetCache();

// Hook to add safe caching to existing budget operations
export function useBudgetSafeCache(userId: string | null) {
  const cacheKey = useRef(`budget_${userId}`);

  // Update cache key when user changes
  if (userId && cacheKey.current !== `budget_${userId}`) {
    cacheKey.current = `budget_${userId}`;
    safeBudgetCache.clearUser(userId);
  }

  // Cached operation function
  const cachedOperation = useCallback(async <T>(
    operationKey: string,
    operation: () => Promise<T>,
    ttl: number = 30000
  ): Promise<T> => {
    if (!userId) return operation();

    const fullKey = `${cacheKey.current}_${operationKey}`;

    // Check cache first
    if (safeBudgetCache.has(fullKey)) {
      return safeBudgetCache.get<T>(fullKey)!;
    }

    // Execute operation and cache result
    const result = await operation();
    safeBudgetCache.set(fullKey, result, ttl);
    return result;
  }, [userId]);

  // Clear cache
  const clearCache = useCallback(() => {
    if (userId) {
      safeBudgetCache.clearUser(userId);
    }
  }, [userId]);

  return {
    cachedOperation,
    clearCache
  };
}

export { safeBudgetCache };
