import React from 'react';

export default function VendorCardSkeleton() {
  return (
    <div className="bg-white border border-[#AB9C95] rounded-[5px] p-4 animate-pulse">
      <div className="flex gap-4">
        {/* Left: Image skeleton */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 bg-[#F3F2F0] rounded-[5px]" />
        </div>
        
        {/* Right: Content skeleton */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="h-5 bg-[#F3F2F0] rounded w-3/4 mb-2" />
              <div className="h-4 bg-[#F3F2F0] rounded w-1/2" />
            </div>
            <div className="flex gap-2 ml-2">
              <div className="w-8 h-8 bg-[#F3F2F0] rounded-full" />
              <div className="w-8 h-8 bg-[#F3F2F0] rounded-full" />
            </div>
          </div>
          
          {/* Category and Price */}
          <div className="flex gap-3 mb-3">
            <div className="h-6 bg-[#F3F2F0] rounded w-20" />
            <div className="h-6 bg-[#F3F2F0] rounded w-12" />
          </div>
          
          {/* Rating */}
          <div className="flex gap-2 mb-3">
            <div className="h-4 bg-[#F3F2F0] rounded w-16" />
            <div className="h-4 bg-[#F3F2F0] rounded w-24" />
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <div className="h-8 bg-[#F3F2F0] rounded w-20" />
            <div className="h-8 bg-[#F3F2F0] rounded w-16" />
            <div className="h-8 bg-[#F3F2F0] rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
