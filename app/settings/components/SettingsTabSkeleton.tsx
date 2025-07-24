import React from 'react';

const SettingsTabSkeleton: React.FC = () => (
  <div className="space-y-6 pb-8 animate-pulse">
    {/* Main container skeleton */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      {/* Title skeleton */}
      <div className="h-6 bg-gray-300 rounded w-32 mb-6" />
      
      {/* Content skeleton */}
      <div className="space-y-4">
        {/* Form field skeletons */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-10 bg-gray-200 rounded w-full" />
          </div>
        ))}
        
        {/* Button skeleton */}
        <div className="h-10 bg-gray-200 rounded w-24 mt-6" />
      </div>
    </div>
    
    {/* Second container skeleton */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="h-6 bg-gray-300 rounded w-40 mb-6" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded w-full" />
        ))}
      </div>
    </div>
  </div>
);

export default SettingsTabSkeleton; 