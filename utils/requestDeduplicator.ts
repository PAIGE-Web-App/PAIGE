/**
 * Request Deduplication Service
 * Prevents duplicate API calls by tracking ongoing requests
 * and returning the same promise for identical requests
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  cache?: boolean;
  cacheTTL?: number;
}

class RequestDeduplicator {
  private static instance: RequestDeduplicator;
  private pendingRequests = new Map<string, PendingRequest>();
  private responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly REQUEST_TIMEOUT = 30 * 1000; // 30 seconds

  static getInstance(): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator();
    }
    return RequestDeduplicator.instance;
  }

  /**
   * Generate a unique key for the request
   */
  private generateKey(url: string, options: RequestOptions = {}): string {
    const { method = 'GET', headers = {}, body } = options;
    
    // Create a hash of the request parameters
    const keyData = {
      url,
      method,
      headers: JSON.stringify(headers),
      body: body ? JSON.stringify(body) : undefined
    };
    
    return btoa(JSON.stringify(keyData));
  }

  /**
   * Check if response is cached and still valid
   */
  private getCachedResponse(key: string, cacheTTL: number): any | null {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Cache a successful response
   */
  private setCachedResponse(key: string, data: any, cacheTTL: number): void {
    this.responseCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL
    });
  }

  /**
   * Make a deduplicated request
   */
  async request(url: string, options: RequestOptions = {}): Promise<any> {
    const {
      method = 'GET',
      headers = {},
      body,
      cache = true,
      cacheTTL = this.DEFAULT_CACHE_TTL
    } = options;

    const key = this.generateKey(url, options);

    // Check cache first
    if (cache) {
      const cached = this.getCachedResponse(key, cacheTTL);
      if (cached) {
        return cached;
      }
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // Return the existing promise
      return pending.promise;
    }

    // Create new request
    const requestPromise = this.makeRequest(url, options);
    
    // Store pending request
    this.pendingRequests.set(key, {
      promise: requestPromise,
      timestamp: Date.now(),
      resolve: () => {},
      reject: () => {}
    });

    try {
      const result = await requestPromise;
      
      // Cache successful response
      if (cache) {
        this.setCachedResponse(key, result, cacheTTL);
      }
      
      return result;
    } catch (error) {
      throw error;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest(url: string, options: RequestOptions): Promise<any> {
    const { method = 'GET', headers = {}, body } = options;
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Clear cache for specific URL pattern
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear cache entries matching pattern
      for (const [key, value] of this.responseCache.entries()) {
        if (key.includes(pattern)) {
          this.responseCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.responseCache.clear();
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.responseCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      cachedResponses: this.responseCache.size,
      cacheKeys: Array.from(this.responseCache.keys())
    };
  }

  /**
   * Cleanup method for testing
   */
  cleanup(): void {
    this.pendingRequests.clear();
    this.responseCache.clear();
  }
}

export default RequestDeduplicator;

// Convenience functions for common request types
export const deduplicatedRequest = {
  get: (url: string, options: Omit<RequestOptions, 'method'> = {}) => {
    const deduplicator = RequestDeduplicator.getInstance();
    return deduplicator.request(url, { ...options, method: 'GET' });
  },
  
  post: (url: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}) => {
    const deduplicator = RequestDeduplicator.getInstance();
    return deduplicator.request(url, { ...options, method: 'POST', body });
  },
  
  put: (url: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}) => {
    const deduplicator = RequestDeduplicator.getInstance();
    return deduplicator.request(url, { ...options, method: 'PUT', body });
  },
  
  delete: (url: string, options: Omit<RequestOptions, 'method'> = {}) => {
    const deduplicator = RequestDeduplicator.getInstance();
    return deduplicator.request(url, { ...options, method: 'DELETE' });
  }
};
