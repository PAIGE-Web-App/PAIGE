import useSWR from 'swr';
import { apiCache, vendorCache, gmailEligibilityCache } from '../lib/cache';

// Optimized API fetch hook with caching
export function useApiFetch<T>(
  endpoint: string,
  params: Record<string, any> = {},
  options?: {
    ttl?: number;
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
  }
) {
  const cacheKey = apiCache.generateKey(endpoint, params);
  
  const { data, error, isLoading, mutate } = useSWR<T>(
    cacheKey,
    async () => {
      // Check cache first
      const cached = await apiCache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const queryString = new URLSearchParams(params).toString();
      const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Cache the result (will be skipped for auth routes)
      await apiCache.set(cacheKey, result, options?.ttl);
      
      return result;
    },
    {
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      revalidateOnReconnect: options?.revalidateOnReconnect ?? true,
      dedupingInterval: 2000,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
    cacheKey,
  };
}

// Optimized vendor details hook
export function useVendorDetails(placeId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    placeId ? `vendor-${placeId}` : null,
    async () => {
      if (!placeId) return null;

      // Check cache first
      const cached = vendorCache.get(placeId);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const response = await fetch(`/api/google-place-details?placeId=${placeId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Cache the result
      vendorCache.set(placeId, result);
      
      return result;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    vendorDetails: data,
    error,
    isLoading,
    mutate,
  };
}

// Optimized Gmail eligibility hook
export function useGmailEligibility(contactId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    contactId ? `gmail-eligibility-${contactId}` : null,
    async () => {
      if (!contactId) return null;

      // Check cache first
      const cached = gmailEligibilityCache.get(contactId);
      if (cached) {
        return cached;
      }

      // This would typically fetch from your Gmail eligibility API
      // For now, return a default structure
      const result = {
        showGmailImport: false,
        showGmailBanner: false,
        bannerDismissed: false,
        importedOnce: false,
      };

      // Cache the result
      gmailEligibilityCache.set(contactId, result);
      
      return result;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000,
    }
  );

  return {
    gmailEligibility: data,
    error,
    isLoading,
    mutate,
  };
}

// Optimized vendor search hook with debouncing
export function useVendorSearch(
  searchTerm: string,
  categories: string[],
  location: string,
  options?: {
    maxResults?: number;
    debounceMs?: number;
  }
) {
  const { data, error, isLoading, mutate } = useSWR(
    searchTerm && searchTerm.length >= 2 
      ? `vendor-search-${searchTerm}-${categories.join(',')}-${location}`
      : null,
    async () => {
      const response = await fetch('/api/google-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          location,
          searchTerm,
          maxResults: options?.maxResults || 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.results || [];
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: options?.debounceMs || 300,
    }
  );

  return {
    vendors: data,
    error,
    isLoading,
    mutate,
  };
}

// Optimized vendor catalog hook
export function useVendorCatalog(
  category: string,
  location: string,
  filters: Record<string, any> = {}
) {
  const { data, error, isLoading, mutate } = useSWR(
    category && location 
      ? `vendor-catalog-${category}-${location}-${JSON.stringify(filters)}`
      : null,
    async () => {
      const response = await fetch('/api/google-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          location,
          ...filters,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    vendors: data?.results || [],
    nextPageToken: data?.next_page_token,
    error,
    isLoading,
    mutate,
  };
} 