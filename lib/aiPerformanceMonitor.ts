/**
 * AI Performance Monitor
 * Tracks and reports AI response times and performance metrics
 */

interface PerformanceMetric {
  endpoint: string;
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  model: string;
  cacheHit?: boolean;
  error?: string;
}

class AIPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  /**
   * Record a performance metric
   */
  record(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      const status = metric.success ? '✅' : '❌';
      const cache = metric.cacheHit ? ' (cached)' : '';
      console.log(`${status} AI ${metric.operation} completed in ${metric.duration}ms${cache}`);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(endpoint?: string): {
    totalRequests: number;
    averageResponseTime: number;
    successRate: number;
    cacheHitRate: number;
    recentMetrics: PerformanceMetric[];
  } {
    const filteredMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;

    const totalRequests = filteredMetrics.length;
    const successfulRequests = filteredMetrics.filter(m => m.success).length;
    const cachedRequests = filteredMetrics.filter(m => m.cacheHit).length;
    
    const averageResponseTime = totalRequests > 0
      ? filteredMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests
      : 0;

    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const cacheHitRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      recentMetrics: filteredMetrics.slice(-10) // Last 10 metrics
    };
  }

  /**
   * Get slowest operations
   */
  getSlowestOperations(limit: number = 5): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const aiPerformanceMonitor = new AIPerformanceMonitor();

/**
 * Performance tracking decorator for AI functions
 */
export function trackAIPerformance(
  endpoint: string,
  operation: string,
  model: string = 'gpt-4o-mini'
) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const startTime = Date.now();
      let success = true;
      let error: string | undefined;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        throw err;
      } finally {
        const duration = Date.now() - startTime;
        
        aiPerformanceMonitor.record({
          endpoint,
          operation,
          duration,
          success,
          model,
          error
        });
      }
    };
  };
}

/**
 * Helper function to track performance manually
 */
export function trackPerformance(
  endpoint: string,
  operation: string,
  model: string = 'gpt-4o-mini'
) {
  return {
    start: () => Date.now(),
    end: (startTime: number, success: boolean = true, error?: string, cacheHit: boolean = false) => {
      const duration = Date.now() - startTime;
      aiPerformanceMonitor.record({
        endpoint,
        operation,
        duration,
        success,
        model,
        cacheHit,
        error
      });
    }
  };
}
