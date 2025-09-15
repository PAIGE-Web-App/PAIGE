/**
 * Shared Vendor Cache Service
 * Prevents duplicate API calls by caching vendor data across all VendorSearchField instances
 * Reduces API costs and improves performance
 */

interface CachedVendors {
  data: any[];
  timestamp: number;
  ttl: number;
}

interface LoadingPromise {
  promise: Promise<any[]>;
  timestamp: number;
}

class VendorCacheService {
  private static instance: VendorCacheService;
  private cache = new Map<string, CachedVendors>();
  private loadingPromises = new Map<string, LoadingPromise>();
  private readonly DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached entries
  private readonly LOADING_TIMEOUT = 30 * 1000; // 30 seconds

  static getInstance(): VendorCacheService {
    if (!VendorCacheService.instance) {
      VendorCacheService.instance = new VendorCacheService();
    }
    return VendorCacheService.instance;
  }

  /**
   * Generate cache key for vendor request
   */
  private generateKey(category: string, location: string): string {
    return `${category}-${location}`.toLowerCase();
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cached: CachedVendors): boolean {
    return Date.now() - cached.timestamp < cached.ttl;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Enforce cache size limit
   */
  private enforceCacheLimit(): void {
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Load vendors from API
   */
  private async loadVendorsFromAPI(category: string, location: string): Promise<any[]> {
    try {
      const requestBody = {
        category: category || 'restaurant',
        location: location || 'United States',
        maxResults: 50 // Load more vendors for better filtering
      };
      
      const response = await fetch('/api/google-places-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        return data.results;
      }
      
      return [];
    } catch (error) {
      console.error('Error loading vendors from API:', error);
      return [];
    }
  }

  /**
   * Get vendors from cache or load from API
   */
  async getVendors(category: string, location: string): Promise<any[]> {
    const key = this.generateKey(category, location);
    
    // Clean up expired cache entries
    this.cleanupCache();
    
    // Check if we have valid cached data
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    // Check if we're already loading this data
    const loading = this.loadingPromises.get(key);
    if (loading) {
      // Check if loading promise is still valid (not too old)
      if (Date.now() - loading.timestamp < this.LOADING_TIMEOUT) {
        return loading.promise;
      } else {
        // Remove stale loading promise
        this.loadingPromises.delete(key);
      }
    }

    // Create new loading promise
    const loadingPromise = this.loadVendorsFromAPI(category, location);
    this.loadingPromises.set(key, {
      promise: loadingPromise,
      timestamp: Date.now()
    });

    try {
      const vendors = await loadingPromise;
      
      // Cache the result
      this.cache.set(key, {
        data: vendors,
        timestamp: Date.now(),
        ttl: this.DEFAULT_TTL
      });

      // Enforce cache size limit
      this.enforceCacheLimit();
      
      return vendors;
    } catch (error) {
      console.error('Error loading vendors:', error);
      return [];
    } finally {
      // Remove from loading promises
      this.loadingPromises.delete(key);
    }
  }

  /**
   * Clear cache for specific category/location
   */
  clearCache(category?: string, location?: string): void {
    if (category && location) {
      const key = this.generateKey(category, location);
      this.cache.delete(key);
      this.loadingPromises.delete(key);
    } else {
      // Clear all cache
      this.cache.clear();
      this.loadingPromises.clear();
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; keys: string[]; loading: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      loading: this.loadingPromises.size
    };
  }
}

// Export singleton instance
export const vendorCacheService = VendorCacheService.getInstance();
export default vendorCacheService;
