import { useCallback, useRef, useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

interface PerformanceStats {
  totalCalls: number;
  averageDuration: number;
  successRate: number;
  slowestCall: number;
  fastestCall: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  startTimer(name: string): string {
    const id = `${name}-${Date.now()}-${Math.random()}`;
    this.metrics.push({
      name,
      startTime: performance.now(),
      success: false
    });
    
    // Keep only the last MAX_METRICS
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
    
    return id;
  }

  endTimer(id: string, success: boolean = true, error?: string): void {
    const metric = this.metrics.find(m => m.name === id.split('-')[0] && !m.endTime);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      metric.error = error;
    }
  }

  getStats(name?: string): PerformanceStats {
    const relevantMetrics = name 
      ? this.metrics.filter(m => m.name === name && m.duration !== undefined)
      : this.metrics.filter(m => m.duration !== undefined);

    if (relevantMetrics.length === 0) {
      return {
        totalCalls: 0,
        averageDuration: 0,
        successRate: 0,
        slowestCall: 0,
        fastestCall: 0
      };
    }

    const durations = relevantMetrics.map(m => m.duration!);
    const successfulCalls = relevantMetrics.filter(m => m.success).length;

    return {
      totalCalls: relevantMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      successRate: (successfulCalls / relevantMetrics.length) * 100,
      slowestCall: Math.max(...durations),
      fastestCall: Math.min(...durations)
    };
  }

  getRecentMetrics(count: number = 10): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.duration !== undefined)
      .slice(-count)
      .reverse();
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Hook for monitoring API calls
export const usePerformanceMonitor = () => {
  const activeTimers = useRef<Map<string, string>>(new Map());

  const startTimer = useCallback((name: string): string => {
    const id = performanceMonitor.startTimer(name);
    activeTimers.current.set(name, id);
    return id;
  }, []);

  const endTimer = useCallback((name: string, success: boolean = true, error?: string): void => {
    const id = activeTimers.current.get(name);
    if (id) {
      performanceMonitor.endTimer(id, success, error);
      activeTimers.current.delete(name);
    }
  }, []);

  const getStats = useCallback((name?: string): PerformanceStats => {
    return performanceMonitor.getStats(name);
  }, []);

  const getRecentMetrics = useCallback((count: number = 10): PerformanceMetric[] => {
    return performanceMonitor.getRecentMetrics(count);
  }, []);

  const clearMetrics = useCallback((): void => {
    performanceMonitor.clearMetrics();
  }, []);

  const exportMetrics = useCallback((): PerformanceMetric[] => {
    return performanceMonitor.exportMetrics();
  }, []);

  // Clean up active timers on unmount
  useEffect(() => {
    return () => {
      // End any active timers
      activeTimers.current.forEach((id, name) => {
        performanceMonitor.endTimer(id, false, 'Component unmounted');
      });
      activeTimers.current.clear();
    };
  }, []);

  return {
    startTimer,
    endTimer,
    getStats,
    getRecentMetrics,
    clearMetrics,
    exportMetrics
  };
};

// Higher-order function to wrap API calls with performance monitoring
export const withPerformanceMonitoring = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
) => {
  return async (...args: T): Promise<R> => {
    const timerId = performanceMonitor.startTimer(name);
    try {
      const result = await fn(...args);
      performanceMonitor.endTimer(timerId, true);
      return result;
    } catch (error) {
      performanceMonitor.endTimer(timerId, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };
};

// Utility to log performance stats in development
export const logPerformanceStats = (name?: string): void => {
  if (process.env.NODE_ENV === 'development') {
    const stats = performanceMonitor.getStats(name);
    console.log(`Performance Stats${name ? ` for ${name}` : ''}:`, stats);
  }
}; 