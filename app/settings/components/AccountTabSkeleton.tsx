import React from 'react';

const AccountTabSkeleton: React.FC = () => (
  <div className="space-y-6 pb-8 animate-pulse">
    {/* Account Details Container */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="h-6 bg-gray-300 rounded w-32 mb-6" />
      
      {/* Avatar section skeleton */}
      <div className="flex flex-col items-center mb-4">
        <div className="w-16 h-16 rounded-full bg-gray-300 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-8" />
      </div>
      
      {/* Form fields skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-10 bg-gray-200 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Collaboration Banner skeleton */}
    <div className="bg-[#805d93] rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-full" />
        <div className="space-y-2">
          <div className="h-4 bg-white/20 rounded w-48" />
          <div className="h-3 bg-white/20 rounded w-64" />
        </div>
      </div>
    </div>
    
    {/* Partner Profile Container */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="h-6 bg-gray-300 rounded w-32 mb-6" />
      <div className="h-3 bg-gray-200 rounded w-64 mb-4" />
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-10 bg-gray-200 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Wedding Planner Profile Container */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="h-6 bg-gray-300 rounded w-40 mb-6" />
      <div className="h-3 bg-gray-200 rounded w-72 mb-4" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-28" />
            <div className="h-10 bg-gray-200 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Danger Zone Container */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="h-6 bg-gray-300 rounded w-24 mb-6" />
      <div className="space-y-4">
        <div className="h-3 bg-gray-200 rounded w-48" />
        <div className="h-8 bg-red-100 rounded w-32" />
      </div>
    </div>
  </div>
);

export default AccountTabSkeleton; 