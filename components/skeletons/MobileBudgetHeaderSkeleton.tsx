import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonIcon } from './SkeletonBase';

const MobileBudgetHeaderSkeleton: React.FC = () => (
  <SkeletonBase className="lg:hidden sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full">
    <div className="flex items-center w-full gap-4 px-4 py-3">
      {/* Back button skeleton */}
      <SkeletonIcon size="md" className="mr-1" />
      
      {/* Title skeleton */}
      <SkeletonTitle width="w-24" />
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Menu button skeleton */}
      <SkeletonIcon size="md" />
    </div>
  </SkeletonBase>
);

export default MobileBudgetHeaderSkeleton;
