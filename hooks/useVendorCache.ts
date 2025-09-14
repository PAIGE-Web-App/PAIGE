import useSWR from 'swr';
import { useCallback } from 'react';

// Enhanced cache for vendor details with smart TTL
const vendorCache = new Map<string, VendorCacheEntry>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const LONG_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes for stable data
const SHORT_CACHE_EXPIRY = 1 * 60 * 1000; // 1 minute for frequently changing data

interface VendorCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  isStable: boolean; // Whether this vendor data is unlikely to change
}

// Determine if vendor data is stable (unlikely to change frequently)
const isVendorDataStable = (vendorData: any): boolean => {
  if (!vendorData?.result) return false;
  
  const { result } = vendorData;
  // Consider data stable if it has basic info and is not a new business
  return !!(
    result.name &&
    result.formatted_address &&
    result.types &&
    result.types.length > 0 &&
    result.business_status === 'OPERATIONAL'
  );
};

// Get appropriate TTL based on data stability and access patterns
const getCacheTTL = (vendorData: any, accessCount: number): number => {
  if (isVendorDataStable(vendorData)) {
    return LONG_CACHE_EXPIRY; // 30 minutes for stable data
  }
  
  if (accessCount > 3) {
    return CACHE_EXPIRY; // 5 minutes for frequently accessed data
  }
  
  return SHORT_CACHE_EXPIRY; // 1 minute for new or unstable data
};

// Fetcher function for SWR with smart caching
const vendorFetcher = async (placeId: string) => {
  const now = Date.now();
  
  // Check cache first with smart TTL
  const cached = vendorCache.get(placeId);
  if (cached && now - cached.timestamp < cached.ttl) {
    // Update access statistics
    cached.accessCount++;
    cached.lastAccessed = now;
    return cached.data;
  }

  // Fetch from API
  const response = await fetch(`/api/google-place-details?placeId=${placeId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  // Determine cache TTL based on data characteristics
  const ttl = getCacheTTL(result, cached?.accessCount || 0);
  
  // Cache the result with smart TTL
  vendorCache.set(placeId, {
    data: result,
    timestamp: now,
    ttl,
    accessCount: (cached?.accessCount || 0) + 1,
    lastAccessed: now,
    isStable: isVendorDataStable(result)
  });
  
  return result;
};

// Hook for fetching vendor details with caching
export const useVendorDetails = (placeId: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    placeId ? `vendor-${placeId}` : null,
    () => vendorFetcher(placeId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      errorRetryCount: 2,
    }
  );

  return {
    vendorDetails: data,
    error,
    isLoading,
    mutate,
  };
};

// Hook for batch fetching multiple vendors
export const useVendorBatch = (placeIds: string[]) => {
  const { data, error, isLoading, mutate } = useSWR(
    placeIds.length > 0 ? `vendors-${placeIds.join(',')}` : null,
    async () => {
      const results = await Promise.all(
        placeIds.map(async (placeId) => {
          try {
            return await vendorFetcher(placeId);
          } catch (error) {
            console.error(`Error fetching vendor ${placeId}:`, error);
            return null;
          }
        })
      );
      return results.filter(Boolean);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    vendors: data || [],
    error,
    isLoading,
    mutate,
  };
};

// Utility function to preload vendor details
export const preloadVendor = (placeId: string) => {
  if (!vendorCache.has(placeId)) {
    vendorFetcher(placeId);
  }
};

// Utility function to clear cache
export const clearVendorCache = () => {
  vendorCache.clear();
};

// Utility function to get cached vendor
export const getCachedVendor = (placeId: string) => {
  const cached = vendorCache.get(placeId);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    // Update access statistics
    cached.accessCount++;
    cached.lastAccessed = Date.now();
    return cached.data;
  }
  return null;
};

// Smart cache invalidation based on patterns
export const invalidateVendorCache = (pattern?: string) => {
  if (pattern) {
    // Invalidate specific vendors matching pattern
    for (const [key, value] of vendorCache.entries()) {
      if (key.includes(pattern)) {
        vendorCache.delete(key);
      }
    }
  } else {
    // Invalidate all cache
    vendorCache.clear();
  }
};

// Clean up expired cache entries
export const cleanupExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of vendorCache.entries()) {
    if (now - value.timestamp > value.ttl) {
      vendorCache.delete(key);
    }
  }
};

// Get cache statistics for monitoring
export const getVendorCacheStats = () => {
  const now = Date.now();
  const stats = {
    totalEntries: vendorCache.size,
    stableEntries: 0,
    expiredEntries: 0,
    totalAccesses: 0,
    averageAccessCount: 0
  };

  for (const [key, value] of vendorCache.entries()) {
    if (value.isStable) stats.stableEntries++;
    if (now - value.timestamp > value.ttl) stats.expiredEntries++;
    stats.totalAccesses += value.accessCount;
  }

  stats.averageAccessCount = stats.totalEntries > 0 
    ? stats.totalAccesses / stats.totalEntries 
    : 0;

  return stats;
};

// Preload vendors with smart caching
export const preloadVendors = async (placeIds: string[]) => {
  const promises = placeIds.map(async (placeId) => {
    if (!vendorCache.has(placeId)) {
      try {
        await vendorFetcher(placeId);
      } catch (error) {
        console.error(`Error preloading vendor ${placeId}:`, error);
      }
    }
  });
  
  await Promise.allSettled(promises);
}; 