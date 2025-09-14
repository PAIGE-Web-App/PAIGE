/**
 * Vendor Email Request Queue Service
 * Prevents 429 rate limiting errors by managing API call frequency
 */

interface QueuedRequest {
  placeId: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class VendorEmailQueue {
  private static instance: VendorEmailQueue;
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): VendorEmailQueue {
    if (!VendorEmailQueue.instance) {
      VendorEmailQueue.instance = new VendorEmailQueue();
    }
    return VendorEmailQueue.instance;
  }

  /**
   * Add a request to the queue
   */
  async queueRequest(placeId: string): Promise<any> {
    // Check cache first
    const cached = this.requestCache.get(placeId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        placeId,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.processQueue();
    });
  }

  /**
   * Process the queue with proper rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      // Wait if we're making requests too frequently
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await this.delay(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }

      const request = this.queue.shift();
      if (!request) break;

      try {
        const result = await this.makeRequest(request.placeId);
        
        // Cache successful results
        this.requestCache.set(request.placeId, {
          data: result,
          timestamp: Date.now()
        });

        request.resolve(result);
        this.lastRequestTime = Date.now();
      } catch (error) {
        console.error('Vendor email request failed:', error);
        request.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Make the actual API request with retry logic
   */
  private async makeRequest(placeId: string, retryCount = 0): Promise<any> {
    try {
      const response = await fetch(`/api/vendor-emails?placeId=${placeId}`);
      
      if (response.status === 429) {
        // Rate limited - wait longer before retry
        if (retryCount < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY * (retryCount + 1));
          return this.makeRequest(placeId, retryCount + 1);
        }
        throw new Error('Rate limited - max retries exceeded');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAY);
        return this.makeRequest(placeId, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Get queue status for debugging
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      lastRequestTime: this.lastRequestTime,
      cacheSize: this.requestCache.size
    };
  }
}

export default VendorEmailQueue;
