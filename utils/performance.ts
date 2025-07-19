// Performance monitoring utility
class PerformanceMonitor {
  private metrics = {
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    pageLoads: 0,
    errors: 0,
    startTime: Date.now(),
  };

  private observers: PerformanceObserver[] = [];

  constructor() {
    this.setupObservers();
  }

  private setupObservers() {
    if (typeof window === 'undefined') return;

    // Monitor navigation timing
    const navigationObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          this.recordPageLoad(navEntry);
        }
      }
    });

    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.recordResourceLoad(resourceEntry);
        }
      }
    });

    try {
      navigationObserver.observe({ entryTypes: ['navigation'] });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(navigationObserver, resourceObserver);
    } catch (error) {
      console.warn('Performance monitoring not supported:', error);
    }
  }

  recordApiCall(endpoint: string, duration: number, success: boolean) {
    this.metrics.apiCalls++;
    if (!success) this.metrics.errors++;

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Call: ${endpoint} - ${duration}ms - ${success ? 'SUCCESS' : 'ERROR'}`);
    }
  }

  recordCacheHit(key: string) {
    this.metrics.cacheHits++;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Cache HIT: ${key}`);
    }
  }

  recordCacheMiss(key: string) {
    this.metrics.cacheMisses++;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Cache MISS: ${key}`);
    }
  }

  private recordPageLoad(navEntry: PerformanceNavigationTiming) {
    this.metrics.pageLoads++;
    
    const loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
    const domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Page Load: ${loadTime}ms, DOM Ready: ${domContentLoaded}ms`);
    }
  }

  private recordResourceLoad(resourceEntry: PerformanceResourceTiming) {
    // Only log slow resources
    if (resourceEntry.duration > 1000) {
      console.warn(`Slow resource: ${resourceEntry.name} - ${resourceEntry.duration}ms`);
    }
  }

  recordError(error: Error, context?: string) {
    this.metrics.errors++;
    
    console.error(`Performance Error${context ? ` (${context})` : ''}:`, error);
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0 
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2)
      : '0.00';

    return {
      ...this.metrics,
      uptime: Math.floor(uptime / 1000), // seconds
      cacheHitRate: `${cacheHitRate}%`,
      apiCallsPerMinute: Math.floor((this.metrics.apiCalls / (uptime / 60000)) * 100) / 100,
    };
  }

  reset() {
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      pageLoads: 0,
      errors: 0,
      startTime: Date.now(),
    };
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions for easy monitoring
export const performanceUtils = {
  // Wrap API calls with performance monitoring
  async monitorApiCall<T>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    
    try {
      const result = await apiCall();
      success = true;
      return result;
    } finally {
      const duration = Date.now() - startTime;
      performanceMonitor.recordApiCall(endpoint, duration, success);
    }
  },

  // Monitor cache operations
  monitorCacheHit(key: string) {
    performanceMonitor.recordCacheHit(key);
  },

  monitorCacheMiss(key: string) {
    performanceMonitor.recordCacheMiss(key);
  },

  // Get performance report
  getReport() {
    return performanceMonitor.getMetrics();
  },

  // Reset metrics
  reset() {
    performanceMonitor.reset();
  },
};

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.destroy();
  });
} 