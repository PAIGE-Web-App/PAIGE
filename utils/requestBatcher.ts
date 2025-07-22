// utils/requestBatcher.ts
// Request batching and debouncing utility for optimizing API calls

interface BatchedRequest<T = any> {
  id: string;
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number; // milliseconds
  maxConcurrentBatches: number;
}

class RequestBatcher<T = any> {
  private pendingRequests: Map<string, BatchedRequest<T>> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private activeBatches = 0;
  private config: BatchConfig;

  constructor(
    private batchProcessor: (requests: BatchedRequest<T>[]) => Promise<Map<string, T>>,
    config: Partial<BatchConfig> = {}
  ) {
    this.config = {
      maxBatchSize: 10,
      maxWaitTime: 50, // 50ms default
      maxConcurrentBatches: 3,
      ...config
    };
  }

  async addRequest(id: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: BatchedRequest<T> = {
        id,
        promise: Promise.resolve() as Promise<T>,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.pendingRequests.set(id, request);

      // Schedule batch processing
      this.scheduleBatch();

      // Set up the promise
      request.promise = new Promise<T>((res, rej) => {
        request.resolve = res;
        request.reject = rej;
      });
    });
  }

  private scheduleBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Process immediately if batch is full
    if (this.pendingRequests.size >= this.config.maxBatchSize) {
      this.processBatch();
      return;
    }

    // Otherwise, wait for the configured time
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.config.maxWaitTime);
  }

  private async processBatch(): Promise<void> {
    if (this.pendingRequests.size === 0 || this.activeBatches >= this.config.maxConcurrentBatches) {
      return;
    }

    this.activeBatches++;

    try {
      const requests = Array.from(this.pendingRequests.values());
      this.pendingRequests.clear();

      const results = await this.batchProcessor(requests);

      // Resolve each request with its result
      requests.forEach(request => {
        const result = results.get(request.id);
        if (result !== undefined) {
          request.resolve(result);
        } else {
          request.reject(new Error(`No result found for request ${request.id}`));
        }
      });
    } catch (error) {
      // Reject all requests in the batch
      const requests = Array.from(this.pendingRequests.values());
      this.pendingRequests.clear();
      requests.forEach(request => request.reject(error));
    } finally {
      this.activeBatches--;
      
      // Process any remaining requests
      if (this.pendingRequests.size > 0) {
        this.scheduleBatch();
      }
    }
  }

  // Get current batch statistics
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      activeBatches: this.activeBatches,
      maxBatchSize: this.config.maxBatchSize,
      maxWaitTime: this.config.maxWaitTime
    };
  }
}

// Debouncing utility for input fields and search
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

// Throttling utility for rate-limited operations
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Google Places API batcher
export class GooglePlacesBatcher {
  private batcher: RequestBatcher<any>;

  constructor() {
    this.batcher = new RequestBatcher(
      async (requests) => {
        // Combine multiple place details requests into a single API call
        const placeIds = requests.map(req => req.id);
        
        try {
          const response = await fetch('/api/google-place-details-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeIds })
          });

          if (!response.ok) {
            throw new Error(`Batch request failed: ${response.statusText}`);
          }

          const results = await response.json();
          const resultMap = new Map();

          // Map results back to request IDs
          results.forEach((result: any, index: number) => {
            resultMap.set(placeIds[index], result);
          });

          return resultMap;
        } catch (error) {
          // If batch fails, fall back to individual requests
          const resultMap = new Map();
          
          for (const request of requests) {
            try {
              const response = await fetch('/api/google-place-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId: request.id })
              });
              
              if (response.ok) {
                const result = await response.json();
                resultMap.set(request.id, result);
              } else {
                throw new Error(`Individual request failed: ${response.statusText}`);
              }
            } catch (individualError) {
              resultMap.set(request.id, { error: individualError.message });
            }
          }
          
          return resultMap;
        }
      },
      {
        maxBatchSize: 5, // Google Places API allows up to 5 place IDs per request
        maxWaitTime: 100, // Wait up to 100ms to batch requests
        maxConcurrentBatches: 2
      }
    );
  }

  async getPlaceDetails(placeId: string) {
    return this.batcher.addRequest(placeId);
  }

  getStats() {
    return this.batcher.getStats();
  }
}

// Vendor data batcher for multiple vendor lookups
export class VendorDataBatcher {
  private batcher: RequestBatcher<any>;

  constructor() {
    this.batcher = new RequestBatcher(
      async (requests) => {
        // Combine multiple vendor data requests
        const vendorIds = requests.map(req => req.id);
        
        try {
          const response = await fetch('/api/vendors/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorIds })
          });

          if (!response.ok) {
            throw new Error(`Vendor batch request failed: ${response.statusText}`);
          }

          const results = await response.json();
          const resultMap = new Map();

          results.forEach((result: any, index: number) => {
            resultMap.set(vendorIds[index], result);
          });

          return resultMap;
        } catch (error) {
          // Fallback to individual requests
          const resultMap = new Map();
          
          for (const request of requests) {
            try {
              const response = await fetch(`/api/vendors/${request.id}`);
              
              if (response.ok) {
                const result = await response.json();
                resultMap.set(request.id, result);
              } else {
                throw new Error(`Individual vendor request failed: ${response.statusText}`);
              }
            } catch (individualError) {
              resultMap.set(request.id, { error: individualError.message });
            }
          }
          
          return resultMap;
        }
      },
      {
        maxBatchSize: 10,
        maxWaitTime: 50,
        maxConcurrentBatches: 3
      }
    );
  }

  async getVendorData(vendorId: string) {
    return this.batcher.addRequest(vendorId);
  }

  getStats() {
    return this.batcher.getStats();
  }
}

// Global instances
export const googlePlacesBatcher = new GooglePlacesBatcher();
export const vendorDataBatcher = new VendorDataBatcher();

// Utility function to get all batcher statistics
export function getBatcherStats() {
  return {
    googlePlaces: googlePlacesBatcher.getStats(),
    vendorData: vendorDataBatcher.getStats()
  };
} 