import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonText, SkeletonButton, SkeletonIcon } from '../skeletons/SkeletonBase';

export default function VendorCardSkeleton() {
  return (
    <SkeletonBase className="group bg-white p-4 min-h-[140px] flex flex-col">
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
              <SkeletonTitle width="w-3/4" className="mb-2" />
              <SkeletonText width="w-1/2" lines={1} />
            </div>
            <div className="flex gap-2 ml-2">
              <SkeletonIcon size="md" className="rounded-full" />
              <SkeletonIcon size="md" className="rounded-full" />
            </div>
          </div>
          
          {/* Price */}
          <div className="mb-1">
            <SkeletonText width="w-12" lines={1} />
          </div>
          
          {/* Rating */}
          <div className="flex gap-1 mb-1">
            <SkeletonText width="w-16" lines={1} />
            <SkeletonText width="w-24" lines={1} />
          </div>
          
          {/* Actions - Hidden by default, shown on hover */}
          <div className="flex gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <SkeletonButton width="w-20" height="h-8" />
            <SkeletonButton width="w-20" height="h-8" />
          </div>
        </div>
      </div>
    </SkeletonBase>
  );
}
