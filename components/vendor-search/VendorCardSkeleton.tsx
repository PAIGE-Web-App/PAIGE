import React from 'react';

export default function VendorCardSkeleton() {
  return (
    <div className="group bg-white p-4 animate-pulse min-h-[140px] flex flex-col">
      <div className="flex gap-4 flex-1">
        {/* Left: Image skeleton */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 bg-[#F3F2F0] rounded-lg" />
        </div>
        
        {/* Right: Content skeleton */}
        <div className="flex-1 flex flex-col">
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
          
          {/* Price */}
          <div className="mb-1">
            <div className="h-4 bg-[#F3F2F0] rounded w-12" />
          </div>
          
          {/* Rating */}
          <div className="flex gap-1 mb-1">
            <div className="h-4 bg-[#F3F2F0] rounded w-16" />
            <div className="h-4 bg-[#F3F2F0] rounded w-24" />
          </div>
          
          {/* Actions - Hidden by default, shown on hover */}
          <div className="flex gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="h-8 bg-[#F3F2F0] rounded w-20" />
            <div className="h-8 bg-[#F3F2F0] rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
