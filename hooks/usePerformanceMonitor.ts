import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  domContentLoaded: number;
  loadComplete: number;
}

interface ComponentMetrics {
  renderTime: number;
  reRenderCount: number;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0,
    timeToInteractive: 0,
    domContentLoaded: 0,
    loadComplete: 0,
  };

  private componentMetrics = new Map<string, ComponentMetrics>();
  private observers: PerformanceObserver[] = [];
  private isClient = false;

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.isClient = true;
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    if (!this.isClient || !('PerformanceObserver' in window)) {
      return;
    }

    // First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.metrics.firstContentfulPaint = fcpEntry.startTime;
          console.log('🚀 First Contentful Paint:', fcpEntry.startTime, 'ms');
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);
    } catch (error) {
      console.warn('FCP observer not supported:', error);
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcpEntry = entries[entries.length - 1];
        if (lcpEntry) {
          this.metrics.largestContentfulPaint = lcpEntry.startTime;
          console.log('🎯 Largest Contentful Paint:', lcpEntry.startTime, 'ms');
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
          console.log('⚡ First Input Delay:', this.metrics.firstInputDelay, 'ms');
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cumulativeLayoutShift = clsValue;
        console.log('📐 Cumulative Layout Shift:', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }

    // DOM Content Loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.metrics.domContentLoaded = performance.now();
        console.log('📄 DOM Content Loaded:', this.metrics.domContentLoaded, 'ms');
      });
    } else {
      this.metrics.domContentLoaded = performance.now();
    }

    // Load Complete
    window.addEventListener('load', () => {
      this.metrics.loadComplete = performance.now();
      console.log('✅ Load Complete:', this.metrics.loadComplete, 'ms');
    });
  }

  public trackComponentRender(componentName: string, renderTime: number) {
    const existing = this.componentMetrics.get(componentName) || {
      renderTime: 0,
      reRenderCount: 0,
    };

    this.componentMetrics.set(componentName, {
      renderTime: Math.max(existing.renderTime, renderTime),
      reRenderCount: existing.reRenderCount + 1,
      memoryUsage: this.getMemoryUsage(),
    });

    console.log(`🎨 ${componentName} rendered in ${renderTime}ms (${existing.reRenderCount + 1} renders)`);
  }

  public trackApiCall(endpoint: string, duration: number, success: boolean) {
    console.log(`🌐 API ${endpoint}: ${duration}ms ${success ? '✅' : '❌'}`);
  }

  public trackFirestoreQuery(collection: string, duration: number, documentCount: number) {
    console.log(`🔥 Firestore ${collection}: ${duration}ms (${documentCount} docs)`);
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getComponentMetrics(): Map<string, ComponentMetrics> {
    return new Map(this.componentMetrics);
  }

  public getMemoryUsage(): number | undefined {
    if (!this.isClient || !('memory' in performance)) {
      return undefined;
    }
    const memory = (performance as any).memory;
    return memory.usedJSHeapSize / 1024 / 1024; // MB
  }

  public generateReport(): string {
    const metrics = this.getMetrics();
    const componentMetrics = this.getComponentMetrics();
    const memoryUsage = this.getMemoryUsage();

    let report = '📊 Performance Report\n\n';
    report += `🚀 First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms\n`;
    report += `🎯 Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(2)}ms\n`;
    report += `⚡ First Input Delay: ${metrics.firstInputDelay.toFixed(2)}ms\n`;
    report += `📐 Cumulative Layout Shift: ${metrics.cumulativeLayoutShift.toFixed(3)}\n`;
    report += `📄 DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms\n`;
    report += `✅ Page Load Complete: ${metrics.loadComplete.toFixed(2)}ms\n`;
    
    if (memoryUsage) {
      report += `💾 Memory Usage: ${memoryUsage.toFixed(2)}MB\n`;
    }

    report += '\n🎨 Component Performance:\n';
    componentMetrics.forEach((metrics, component) => {
      report += `  ${component}: ${metrics.renderTime.toFixed(2)}ms (${metrics.reRenderCount} renders)\n`;
    });

    return report;
  }

  public cleanup() {
    if (!this.isClient) return;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Interface for the dummy monitor
interface DummyPerformanceMonitor {
  trackComponentRender: () => void;
  trackApiCall: () => void;
  trackFirestoreQuery: () => void;
  getMetrics: () => PerformanceMetrics;
  getComponentMetrics: () => Map<string, ComponentMetrics>;
  getMemoryUsage: () => undefined;
  generateReport: () => string;
  cleanup: () => void;
}

// Lazy-loaded performance monitor instance
let performanceMonitor: PerformanceMonitor | null = null;

function getPerformanceMonitor(): PerformanceMonitor | DummyPerformanceMonitor {
  if (typeof window === 'undefined') {
    // Return a dummy monitor for SSR
    return {
      trackComponentRender: () => {},
      trackApiCall: () => {},
      trackFirestoreQuery: () => {},
      getMetrics: () => ({
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0,
        timeToInteractive: 0,
        domContentLoaded: 0,
        loadComplete: 0,
      }),
      getComponentMetrics: () => new Map(),
      getMemoryUsage: () => undefined,
      generateReport: () => 'Performance monitoring not available on server',
      cleanup: () => {},
    };
  }
  
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  
  return performanceMonitor;
}

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    renderStartTime.current = performance.now();
    renderCount.current++;

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      getPerformanceMonitor().trackComponentRender(componentName, renderTime);
    };
  });

  const trackApiCall = useCallback((endpoint: string, duration: number, success: boolean) => {
    getPerformanceMonitor().trackApiCall(endpoint, duration, success);
  }, []);

  const trackFirestoreQuery = useCallback((collection: string, duration: number, documentCount: number) => {
    getPerformanceMonitor().trackFirestoreQuery(collection, duration, documentCount);
  }, []);

  const getMetrics = useCallback(() => {
    return getPerformanceMonitor().getMetrics();
  }, []);

  const generateReport = useCallback(() => {
    return getPerformanceMonitor().generateReport();
  }, []);

  return {
    trackApiCall,
    trackFirestoreQuery,
    getMetrics,
    generateReport,
  };
}

// Utility function to measure async operations
export function measureAsync<T>(operation: () => Promise<T>, name: string): Promise<T> {
  if (typeof window === 'undefined') {
    return operation();
  }
  const startTime = performance.now();
  return operation().finally(() => {
    const duration = performance.now() - startTime;
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
  });
}

// Utility function to measure synchronous operations
export function measureSync<T>(operation: () => T, name: string): T {
  if (typeof window === 'undefined') {
    return operation();
  }
  const startTime = performance.now();
  const result = operation();
  const duration = performance.now() - startTime;
  console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
  return result;
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (performanceMonitor) {
      performanceMonitor.cleanup();
    }
  });
}

export { getPerformanceMonitor as performanceMonitor }; 