import React, { useState, useEffect } from 'react';
import { getImageCacheStats } from '@/utils/vendorImageCache';

interface VendorImageCacheMonitorProps {
  showDetails?: boolean;
  className?: string;
}

export default function VendorImageCacheMonitor({ 
  showDetails = false, 
  className = '' 
}: VendorImageCacheMonitorProps) {
  const [stats, setStats] = useState(getImageCacheStats());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(getImageCacheStats());
    };

    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000);
    
    // Show monitor after 5 seconds of page load
    const showTimer = setTimeout(() => setIsVisible(true), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(showTimer);
    };
  }, []);

  if (!isVisible || process.env.NODE_ENV === 'production') {
    return null;
  }

  const formatTime = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  };

  return (
    <div className={`fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs z-50 ${className}`}>
      <div className="font-semibold text-gray-700 mb-1">🖼️ Image Cache</div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Size:</span>
          <span className="font-mono">{stats.size}</span>
        </div>
        
        {showDetails && (
          <>
            <div className="flex justify-between">
              <span>Hit Rate:</span>
              <span className="font-mono">{stats.hitRate}%</span>
            </div>
            <div className="flex justify-between">
              <span>Oldest:</span>
              <span className="font-mono">{formatTime(stats.oldestEntry)}</span>
            </div>
          </>
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        {stats.size > 0 ? '✅ Active' : '⏳ Empty'}
      </div>
    </div>
  );
} 