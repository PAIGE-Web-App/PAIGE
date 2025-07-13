import React from 'react';

const VendorSkeleton: React.FC = () => (
  <div className="border rounded-[5px] border-[#AB9C95] p-4 flex flex-row items-center gap-4 animate-pulse">
    {/* Left: Star, Name, Category, Email, Phone */}
    <div className="flex flex-col flex-1 gap-1">
      <div className="flex items-center gap-2">
        {/* Star skeleton */}
        <div className="w-5 h-5 bg-gray-300 rounded" />
        {/* Name skeleton */}
        <div className="h-4 bg-gray-300 rounded w-32" />
        {/* Category pill skeleton */}
        <div className="w-16 h-5 bg-gray-200 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        {/* Email skeleton */}
        <div className="h-3 bg-gray-200 rounded w-24" />
        {/* Phone skeleton */}
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    </div>
    {/* Right: Edit and Contact buttons skeleton */}
    <div className="flex gap-2">
      <div className="w-16 h-7 bg-gray-200 rounded" />
      <div className="w-16 h-7 bg-gray-200 rounded" />
    </div>
  </div>
);

export default VendorSkeleton; 