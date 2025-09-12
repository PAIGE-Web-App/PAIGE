import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonText, SkeletonButton, SkeletonIcon } from './skeletons/SkeletonBase';

const VendorSkeleton: React.FC = () => (
  <SkeletonBase className="border rounded-[5px] border-[#AB9C95] p-4 flex flex-row items-center gap-4">
    {/* Left: Star, Name, Category, Email, Phone */}
    <div className="flex flex-col flex-1 gap-1">
      <div className="flex items-center gap-2">
        {/* Star skeleton */}
        <SkeletonIcon size="md" />
        {/* Name skeleton */}
        <SkeletonTitle width="w-32" />
        {/* Category pill skeleton */}
        <SkeletonButton width="w-16" height="h-5" className="rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        {/* Email skeleton */}
        <SkeletonText width="w-24" lines={1} />
        {/* Phone skeleton */}
        <SkeletonText width="w-20" lines={1} />
      </div>
    </div>
    {/* Right: Edit and Contact buttons skeleton */}
    <div className="flex gap-2">
      <SkeletonButton width="w-16" height="h-7" />
      <SkeletonButton width="w-16" height="h-7" />
    </div>
  </SkeletonBase>
);

export default VendorSkeleton; 