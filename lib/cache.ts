import { SWRConfiguration } from 'swr';

// Cache configuration
export const CACHE_CONFIG = {
  // SWR default configuration
  swr: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    focusThrottleInterval: 5000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  } as SWRConfiguration,

  // Local storage keys
  storage: {
    userProfile: 'paige_user_profile',
    vendorFavorites: 'paige_vendor_favorites',
    viewMode: 'paige_viewMode',
    calendarViewMode: 'paige_calendarViewMode',
    vendorDetails: 'paige_vendor_details',
    gmailEligibility: 'paige_gmail_eligibility',
    apiCache: 'paige_api_cache',
  },

  // Cache TTLs (Time To Live) in milliseconds
  ttl: {
    userProfile: 5 * 60 * 1000, // 5 minutes
    vendorDetails: 30 * 60 * 1000, // 30 minutes
    apiResponses: 10 * 60 * 1000, // 10 minutes
    gmailEligibility: 60 * 60 * 1000, // 1 hour
    vendorFavorites: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Routes that should never be cached
  noCacheRoutes: [
    '/api/sessionLogin',
    '/api/sessionLogout',
    '/api/auth/',
    '/login',
    '/signup',
  ],

  // In-memory cache limits
  memory: {
    maxVendorDetails: 50,
    maxApiResponses: 100,
    maxGmailEligibility: 20,
  },
};

// In-memory cache for frequently accessed data
class MemoryCache {
  public cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Local storage cache with TTL
class LocalStorageCache {
  set(key: string, data: any, ttl: number = 24 * 60 * 60 * 1000) {
    if (typeof window === 'undefined') return;

    const item = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  get(key: string): any | null {
    if (typeof window === 'undefined') return null;

    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  delete(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }

  clear() {
    if (typeof window === 'undefined') return;
    
    // Only clear Paige-related items
    Object.values(CACHE_CONFIG.storage).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

// API response cache
class ApiCache {
  public memoryCache = new MemoryCache();
  private storageCache = new LocalStorageCache();

  async get<T>(key: string): Promise<T | null> {
    // Don't cache authentication routes
    if (CACHE_CONFIG.noCacheRoutes.some(route => key.includes(route))) {
      return null;
    }

    // Check memory cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) return memoryResult;

    // Check localStorage
    const storageResult = this.storageCache.get(key);
    if (storageResult) {
      // Restore to memory cache
      this.memoryCache.set(key, storageResult, CACHE_CONFIG.ttl.apiResponses);
      return storageResult;
    }

    return null;
  }

  async set(key: string, data: any, ttl: number = CACHE_CONFIG.ttl.apiResponses) {
    // Don't cache authentication routes
    if (CACHE_CONFIG.noCacheRoutes.some(route => key.includes(route))) {
      return;
    }

    // Store in both memory and localStorage
    this.memoryCache.set(key, data, ttl);
    this.storageCache.set(key, data, ttl);
  }

  async delete(key: string) {
    this.memoryCache.delete(key);
    this.storageCache.delete(key);
  }

  // Generate cache key for API requests
  generateKey(endpoint: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${endpoint}${sortedParams ? `?${sortedParams}` : ''}`;
  }
}

// Vendor details cache
class VendorCache {
  public memoryCache = new MemoryCache();
  private storageCache = new LocalStorageCache();

  get(placeId: string): any | null {
    const memoryResult = this.memoryCache.get(placeId);
    if (memoryResult) return memoryResult;

    const storageResult = this.storageCache.get(`${CACHE_CONFIG.storage.vendorDetails}_${placeId}`);
    if (storageResult) {
      this.memoryCache.set(placeId, storageResult, CACHE_CONFIG.ttl.vendorDetails);
      return storageResult;
    }

    return null;
  }

  set(placeId: string, data: any) {
    this.memoryCache.set(placeId, data, CACHE_CONFIG.ttl.vendorDetails);
    this.storageCache.set(`${CACHE_CONFIG.storage.vendorDetails}_${placeId}`, data, CACHE_CONFIG.ttl.vendorDetails);
  }

  delete(placeId: string) {
    this.memoryCache.delete(placeId);
    this.storageCache.delete(`${CACHE_CONFIG.storage.vendorDetails}_${placeId}`);
  }

  clear() {
    this.memoryCache.clear();
    // Note: We can't easily clear all vendor details from localStorage without knowing all keys
    // This is a limitation of localStorage
  }
}

// Gmail eligibility cache
class GmailEligibilityCache {
  public memoryCache = new MemoryCache();
  private storageCache = new LocalStorageCache();

  get(contactId: string): any | null {
    const memoryResult = this.memoryCache.get(contactId);
    if (memoryResult) return memoryResult;

    const storageResult = this.storageCache.get(`${CACHE_CONFIG.storage.gmailEligibility}_${contactId}`);
    if (storageResult) {
      this.memoryCache.set(contactId, storageResult, CACHE_CONFIG.ttl.gmailEligibility);
      return storageResult;
    }

    return null;
  }

  set(contactId: string, data: any) {
    this.memoryCache.set(contactId, data, CACHE_CONFIG.ttl.gmailEligibility);
    this.storageCache.set(`${CACHE_CONFIG.storage.gmailEligibility}_${contactId}`, data, CACHE_CONFIG.ttl.gmailEligibility);
  }

  delete(contactId: string) {
    this.memoryCache.delete(contactId);
    this.storageCache.delete(`${CACHE_CONFIG.storage.gmailEligibility}_${contactId}`);
  }
}

// Export cache instances
export const apiCache = new ApiCache();
export const vendorCache = new VendorCache();
export const gmailEligibilityCache = new GmailEligibilityCache();
export const localStorageCache = new LocalStorageCache();

// Utility functions
export const cacheUtils = {
  // Clean up all caches
  cleanup: () => {
    apiCache.memoryCache.cleanup();
    vendorCache.memoryCache.cleanup();
    gmailEligibilityCache.memoryCache.cleanup();
  },

  // Clear all caches
  clearAll: () => {
    apiCache.memoryCache.clear();
    vendorCache.memoryCache.clear();
    gmailEligibilityCache.memoryCache.clear();
    localStorageCache.clear();
  },

  // Get cache statistics
  getStats: () => {
    return {
      apiCacheSize: apiCache.memoryCache.cache.size,
      vendorCacheSize: vendorCache.memoryCache.cache.size,
      gmailEligibilityCacheSize: gmailEligibilityCache.memoryCache.cache.size,
    };
  },
};

// Set up periodic cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheUtils.cleanup();
  }, 5 * 60 * 1000); // Clean up every 5 minutes
} 