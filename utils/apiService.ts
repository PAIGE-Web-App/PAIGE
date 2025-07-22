import { withPerformanceMonitoring } from '@/hooks/usePerformanceMonitor';

// API Service for centralized request management
interface ApiRequest {
  id: string;
  url: string;
  options?: RequestInit;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class ApiService {
  private requestQueue: Map<string, ApiRequest> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly BATCH_DELAY = 50; // 50ms

  // Single request with caching and performance monitoring
  request = withPerformanceMonitoring(async <T>(url: string, options?: RequestInit): Promise<T> => {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
      return cached.data;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }, 'api-request');

  // Batch multiple requests
  async batchRequest<T>(requests: Array<{ id: string; url: string; options?: RequestInit }>): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const promises = requests.map(async ({ id, url, options }) => {
      try {
        const data = await this.request<T>(url, options);
        results.set(id, data);
      } catch (error) {
        console.error(`Batch request failed for ${id}:`, error);
        results.set(id, null as T);
      }
    });

    await Promise.all(promises);
    return results;
  }

  // Debounced request
  debouncedRequest<T>(url: string, options?: RequestInit, delay: number = 300): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `${url}-${Date.now()}`;
      
      // Clear existing timeout
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }

      // Add to queue
      this.requestQueue.set(requestId, {
        id: requestId,
        url,
        options,
        resolve,
        reject
      });

      // Set timeout to execute batch
      this.batchTimeout = setTimeout(() => {
        this.executeBatch();
      }, delay);
    });
  }

  private async executeBatch(): Promise<void> {
    const requests = Array.from(this.requestQueue.values());
    this.requestQueue.clear();

    if (requests.length === 0) return;

    // Execute requests in parallel
    const promises = requests.map(async (request) => {
      try {
        const data = await this.request(request.url, request.options);
        request.resolve(data);
      } catch (error) {
        request.reject(error);
      }
    });

    await Promise.all(promises);
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Clear specific cache entry
  clearCacheEntry(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Preload data
  preload<T>(url: string, options?: RequestInit): Promise<T> {
    return this.request<T>(url, options);
  }
}

// Singleton instance
export const apiService = new ApiService();

// Convenience functions
export const fetchVendorDetails = (placeId: string) => 
  apiService.request(`/api/google-place-details?placeId=${placeId}`);

export const fetchVendorPhotos = (placeId: string) => 
  apiService.request(`/api/vendor-photos/${placeId}`);

export const fetchCommunityVendor = (placeId: string) => 
  apiService.request(`/api/community-vendors?placeId=${placeId}`);

export const checkVendorExists = (placeId: string, userId: string) => 
  apiService.request(`/api/check-vendor-exists?placeId=${placeId}&userId=${userId}`);

// Batch fetch vendor details
export const batchFetchVendorDetails = (placeIds: string[]) => {
  const requests = placeIds.map(id => ({
    id,
    url: `/api/google-place-details?placeId=${id}`
  }));
  return apiService.batchRequest(requests);
};

// Debounced vendor search
export const debouncedVendorSearch = (searchTerm: string, category: string, location: string) => 
  apiService.debouncedRequest('/api/google-places', {
    method: 'POST',
    body: JSON.stringify({ category, location, searchTerm })
  }); 