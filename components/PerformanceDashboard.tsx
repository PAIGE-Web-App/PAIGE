"use client";

import React, { useState, useEffect } from 'react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

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

export default function PerformanceDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [componentMetrics, setComponentMetrics] = useState<Map<string, ComponentMetrics>>(new Map());
  const [memoryUsage, setMemoryUsage] = useState<number | undefined>();

  useEffect(() => {
    // Get performance monitor instance
    const monitor = (window as any).performanceMonitor;
    if (monitor) {
      const updateMetrics = () => {
        setMetrics(monitor.getMetrics());
        setComponentMetrics(monitor.getComponentMetrics());
        setMemoryUsage(monitor.getMemoryUsage());
      };

      // Update metrics every second
      const interval = setInterval(updateMetrics, 1000);
      updateMetrics(); // Initial update

      return () => clearInterval(interval);
    }
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg z-50"
        title="Show Performance Dashboard"
      >
        📊
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Performance Dashboard</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {metrics && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">FCP</div>
              <div className="font-mono">{metrics.firstContentfulPaint.toFixed(0)}ms</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">LCP</div>
              <div className="font-mono">{metrics.largestContentfulPaint.toFixed(0)}ms</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">FID</div>
              <div className="font-mono">{metrics.firstInputDelay.toFixed(0)}ms</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600">CLS</div>
              <div className="font-mono">{metrics.cumulativeLayoutShift.toFixed(3)}</div>
            </div>
          </div>

          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600 text-sm">Load Complete</div>
            <div className="font-mono text-lg">{metrics.loadComplete.toFixed(0)}ms</div>
          </div>

          {memoryUsage && (
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-gray-600 text-sm">Memory Usage</div>
              <div className="font-mono">{memoryUsage.toFixed(1)}MB</div>
            </div>
          )}
        </div>
      )}

      {componentMetrics.size > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Component Metrics</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Array.from(componentMetrics.entries()).map(([name, metrics]) => (
              <div key={name} className="text-xs bg-gray-50 p-2 rounded">
                <div className="font-medium">{name}</div>
                <div className="grid grid-cols-2 gap-1">
                  <span>Render: {metrics.renderTime.toFixed(1)}ms</span>
                  <span>Re-renders: {metrics.reRenderCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={() => {
            const monitor = (window as any).performanceMonitor;
            if (monitor) {
              console.log(monitor.generateReport());
            }
          }}
          className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
        >
          Generate Report
        </button>
      </div>
    </div>
  );
}
