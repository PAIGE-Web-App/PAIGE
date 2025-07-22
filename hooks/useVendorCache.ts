import useSWR from 'swr';
import { useCallback } from 'react';

// Global cache for vendor details
const vendorCache = new Map<string, any>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface VendorCacheEntry {
  data: any;
  timestamp: number;
}

// Fetcher function for SWR
const vendorFetcher = async (placeId: string) => {
  // Check cache first
  const cached = vendorCache.get(placeId);
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.data;
  }

  // Fetch from API
  const response = await fetch(`/api/google-place-details?placeId=${placeId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  // Cache the result
  vendorCache.set(placeId, {
    data: result,
    timestamp: Date.now()
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
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.data;
  }
  return null;
}; 