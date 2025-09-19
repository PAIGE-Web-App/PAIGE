/**
 * AI Response Cache Service
 * Provides intelligent caching for AI responses to improve performance
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  hash: string;
}

class AIResponseCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100; // Maximum number of cached responses

  /**
   * Generate a cache key from request parameters
   */
  private generateKey(endpoint: string, params: any): string {
    // Create a deterministic hash of the request parameters
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `${endpoint}:${this.simpleHash(paramString)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached response if available and not expired
   */
  get(endpoint: string, params: any): any | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`🎯 AI Cache HIT for ${endpoint}`);
    return entry.data;
  }

  /**
   * Store response in cache
   */
  set(endpoint: string, params: any, data: any, ttl: number = 5 * 60 * 1000): void {
    const key = this.generateKey(endpoint, params);
    
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hash: key
    });

    console.log(`💾 AI Cache STORED for ${endpoint} (TTL: ${ttl}ms)`);
  }

  /**
   * Clear cache for specific endpoint or all cache
   */
  clear(endpoint?: string): void {
    if (endpoint) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(endpoint));
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`🗑️ AI Cache CLEARED for ${endpoint}`);
    } else {
      this.cache.clear();
      console.log(`🗑️ AI Cache CLEARED (all)`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// Export singleton instance
export const aiResponseCache = new AIResponseCache();

/**
 * Cache configuration for different AI endpoints
 */
export const AI_CACHE_CONFIG = {
  // File analysis - cache for 10 minutes (same file, same analysis type)
  'file-analysis': 10 * 60 * 1000,
  
  // Budget generation - cache for 30 minutes (same description, same budget)
  'budget-generation': 30 * 60 * 1000,
  
  // Message analysis - cache for 5 minutes (same message content)
  'message-analysis': 5 * 60 * 1000,
  
  // Todo generation - cache for 15 minutes (same description)
  'todo-generation': 15 * 60 * 1000,
  
  // Moodboard generation - cache for 1 hour (same images)
  'moodboard-generation': 60 * 60 * 1000,
  
  // Default cache time
  'default': 5 * 60 * 1000
};

/**
 * Helper function to get cache TTL for endpoint
 */
export function getCacheTTL(endpoint: string): number {
  return AI_CACHE_CONFIG[endpoint as keyof typeof AI_CACHE_CONFIG] || AI_CACHE_CONFIG.default;
}
