'use client';

import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface UnifiedLoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

export default function UnifiedLoadingScreen({ 
  message = "Loading your Dream Day Details...",
  showProgress = false,
  progress = 0
}: UnifiedLoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-linen">
      <div className="text-center max-w-md mx-auto px-6">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-[#6B7280] text-sm font-work">
          {message}
        </p>
        
        {showProgress && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#A85C36] h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#6B7280]">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
