// Simple cache for budget data to reduce redundant Firestore reads
// This is a safe optimization that doesn't change existing functionality

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class BudgetCache {
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

  // Clear cache for specific user
  clearUser(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(userId));
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

export const budgetCache = new BudgetCache();
