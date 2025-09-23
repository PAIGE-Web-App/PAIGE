// Query optimization utilities for budget system
// This reduces Firestore reads by consolidating queries and adding intelligent caching

import { budgetCache } from './useBudgetCache';

interface QueryOptimizationOptions {
  enableCache?: boolean;
  cacheTTL?: number;
  batchSize?: number;
  debounceMs?: number;
}

export class BudgetQueryOptimizer {
  private static instance: BudgetQueryOptimizer;
  private pendingQueries = new Map<string, Promise<any>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  static getInstance(): BudgetQueryOptimizer {
    if (!BudgetQueryOptimizer.instance) {
      BudgetQueryOptimizer.instance = new BudgetQueryOptimizer();
    }
    return BudgetQueryOptimizer.instance;
  }

  // Debounce multiple rapid queries to the same collection
  debounceQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    debounceMs: number = 100
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Clear existing timer
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        try {
          const result = await queryFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.debounceTimers.delete(key);
        }
      }, debounceMs);

      this.debounceTimers.set(key, timer);
    });
  }

  // Cache query results to avoid redundant reads
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: QueryOptimizationOptions = {}
  ): Promise<T> {
    const {
      enableCache = true,
      cacheTTL = 30000,
      batchSize = 50
    } = options;

    // Check cache first
    if (enableCache && budgetCache.has(key)) {
      return budgetCache.get<T>(key)!;
    }

    // Check if query is already pending
    if (this.pendingQueries.has(key)) {
      return this.pendingQueries.get(key)!;
    }

    // Execute query
    const queryPromise = queryFn().then(result => {
      // Cache the result
      if (enableCache) {
        budgetCache.set(key, result, cacheTTL);
      }
      
      // Remove from pending
      this.pendingQueries.delete(key);
      
      return result;
    }).catch(error => {
      // Remove from pending on error
      this.pendingQueries.delete(key);
      throw error;
    });

    // Store pending query
    this.pendingQueries.set(key, queryPromise);

    return queryPromise;
  }

  // Batch multiple operations to reduce Firestore writes
  async batchOperations(operations: Array<() => Promise<any>>): Promise<any[]> {
    const results = await Promise.allSettled(operations);
    
    // Return successful results, log failures
    return results.map((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`Batch operation ${index} failed:`, result.reason);
        return null;
      }
      return result.value;
    });
  }

  // Clear cache for specific user
  clearUserCache(userId: string): void {
    budgetCache.clearUser(userId);
  }

  // Clear all caches
  clearAllCaches(): void {
    budgetCache.clear();
  }
}

export const budgetQueryOptimizer = BudgetQueryOptimizer.getInstance();
