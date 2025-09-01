// utils/vendorSearchCache.ts
// Enhanced caching for vendor search results to reduce Google Places API costs

interface CachedSearchResult {
  results: any[];
  timestamp: number;
  nextPageToken?: string;
  category: string;
  location: string;
  filters: Record<string, any>;
  hash: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSearches: number;
  cacheSize: number;
  lastCleanup: number;
}

class VendorSearchCache {
  private cache = new Map<string, CachedSearchResult>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalSearches: 0,
    cacheSize: 0,
    lastCleanup: Date.now()
  };
  
  // Cache TTL: 1 hour for search results, 24 hours for location data
  private readonly SEARCH_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly LOCATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000; // Maximum cached searches
  
  /**
   * Generate cache key for search parameters
   */
  private generateCacheKey(category: string, location: string, filters: Record<string, any> = {}): string {
    // Normalize and sort filters for consistent cache keys
    const normalizedFilters = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          acc[key] = filters[key];
        }
        return acc;
      }, {} as Record<string, any>);
    
    const filterString = JSON.stringify(normalizedFilters);
    return `search_${category}_${location}_${filterString}`;
  }
  
  /**
   * Check if cached result is still valid
   */
  private isCacheValid(cached: CachedSearchResult): boolean {
    const now = Date.now();
    const age = now - cached.timestamp;
    
    // Different TTL based on result type
    if (cached.results.length === 0) {
      // Empty results cache for shorter time (15 minutes)
      return age < (15 * 60 * 1000);
    }
    
    // Results with data cache for longer time (1 hour)
    return age < this.SEARCH_CACHE_TTL;
  }
  
  /**
   * Get cached search results
   */
  async getCachedResults(
    category: string, 
    location: string, 
    filters: Record<string, any> = {}
  ): Promise<CachedSearchResult | null> {
    const cacheKey = this.generateCacheKey(category, location, filters);
    const cached = this.cache.get(cacheKey);
    
    this.stats.totalSearches++;
    
    if (!cached) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    if (!this.isCacheValid(cached)) {
      // Remove expired cache entry
      this.cache.delete(cacheKey);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Cache hit!
    this.stats.hits++;
    this.updateHitRate();
    
    console.log(`🎯 Cache HIT for search: ${category} in ${location}`);
    return cached;
  }
  
  /**
   * Get cached search results without affecting stats (for progressive loading)
   */
  async getCachedResultsSilent(
    category: string, 
    location: string, 
    filters: Record<string, any> = {}
  ): Promise<CachedSearchResult | null> {
    const cacheKey = this.generateCacheKey(category, location, filters);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    if (!this.isCacheValid(cached)) {
      // Remove expired cache entry
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }
  
  /**
   * Cache search results
   */
  async cacheResults(
    category: string,
    location: string,
    results: any[],
    filters: Record<string, any> = {},
    nextPageToken?: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(category, location, filters);
    
    const cachedResult: CachedSearchResult = {
      results,
      timestamp: Date.now(),
      nextPageToken,
      category,
      location,
      filters,
      hash: cacheKey
    };
    
    // Check cache size and cleanup if necessary
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }
    
    this.cache.set(cacheKey, cachedResult);
    this.stats.cacheSize = this.cache.size;
    
    console.log(`💾 Cached search results: ${category} in ${location} (${results.length} results)`);
  }
  
  /**
   * Get cached location coordinates
   */
  async getCachedLocation(location: string): Promise<{ lat: number; lng: number } | null> {
    const cacheKey = `location_${location}`;
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    if (age > this.LOCATION_CACHE_TTL) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    console.log(`🎯 Location cache HIT for: ${location}`);
    return cached.results[0]?.geometry?.location || null;
  }
  
  /**
   * Cache location coordinates
   */
  async cacheLocation(location: string, coordinates: { lat: number; lng: number }): Promise<void> {
    const cacheKey = `location_${location}`;
    
    const cachedResult: CachedSearchResult = {
      results: [{ geometry: { location: coordinates } }],
      timestamp: Date.now(),
      category: 'location',
      location,
      filters: {},
      hash: cacheKey
    };
    
    this.cache.set(cacheKey, cachedResult);
    console.log(`💾 Cached location coordinates for: ${location}`);
  }
  
  /**
   * Check if we have recent results for a search
   */
  hasRecentResults(category: string, location: string, filters: Record<string, any> = {}): boolean {
    const cacheKey = this.generateCacheKey(category, location, filters);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return false;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    // Consider "recent" if less than 30 minutes old
    return age < (30 * 60 * 1000);
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Get cache size information
   */
  getCacheSize(): { entries: number; maxSize: number } {
    return {
      entries: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE
    };
  }

  /**
   * Predictive caching for popular searches
   */
  async predictAndCachePopularSearches(): Promise<void> {
    const popularSearches = [
      { category: 'venue', location: 'Dallas, TX' },
      { category: 'photographer', location: 'Dallas, TX' },
      { category: 'florist', location: 'Dallas, TX' },
      { category: 'caterer', location: 'Dallas, TX' },
      { category: 'dj', location: 'Dallas, TX' },
      { category: 'venue', location: 'Austin, TX' },
      { category: 'photographer', location: 'Austin, TX' },
      { category: 'florist', location: 'Austin, TX' }
    ];

    console.log('🚀 Starting predictive caching for popular searches...');
    
    for (const search of popularSearches) {
      try {
        // Check if we already have recent results
        const existing = await this.getCachedResults(search.category, search.location);
        if (existing && this.isCacheValid(existing)) {
          console.log(`✅ ${search.category} in ${search.location} already cached`);
          continue;
        }

        // Trigger background caching (this would integrate with your Google Places API)
        console.log(`🔄 Pre-caching ${search.category} in ${search.location}`);
        // Note: This would call your Google Places API in the background
        // For now, we'll just log the intention
        
      } catch (error) {
        console.warn(`⚠️ Failed to pre-cache ${search.category} in ${search.location}:`, error);
      }
    }
    
    console.log('✅ Predictive caching completed');
  }

  /**
   * Get popular search suggestions based on cache patterns
   */
  getPopularSearchSuggestions(): Array<{ category: string; location: string; frequency: number }> {
    const suggestions: Array<{ category: string; location: string; frequency: number }> = [];
    const searchCounts = new Map<string, number>();

    // Count search frequency
    for (const [key, value] of this.cache.entries()) {
      if (value.category && value.location) {
        const searchKey = `${value.category}:${value.location}`;
        searchCounts.set(searchKey, (searchCounts.get(searchKey) || 0) + 1);
      }
    }

    // Convert to array and sort by frequency
    for (const [searchKey, frequency] of searchCounts.entries()) {
      const [category, location] = searchKey.split(':');
      suggestions.push({ category, location, frequency });
    }

    return suggestions.sort((a, b) => b.frequency - a.frequency).slice(0, 10);
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      const age = now - value.timestamp;
      
      if (age > this.SEARCH_CACHE_TTL) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    this.stats.cacheSize = this.cache.size;
    this.stats.lastCleanup = now;
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }
  
  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
  
  /**
   * Clear all cache (for testing/debugging)
   */
  clearCache(): void {
    this.cache.clear();
    this.stats.cacheSize = 0;
    console.log('🧹 Vendor search cache cleared');
  }
}

// Export singleton instance
export const vendorSearchCache = new VendorSearchCache();

// Export types for use in other files
export type { CachedSearchResult, CacheStats };
