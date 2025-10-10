import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonIcon } from './SkeletonBase';

const HeaderSkeleton: React.FC = () => (
  <div className="bg-white border-b border-[#E0D6D0] px-6 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SkeletonIcon size="sm" />
        <SkeletonText width="w-32" />
      </div>
      
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <SkeletonIcon size="sm" />
          <SkeletonText width="w-16" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonIcon size="sm" />
          <SkeletonText width="w-8" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonIcon size="sm" />
          <SkeletonText width="w-20" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonIcon size="sm" />
          <SkeletonText width="w-24" />
        </div>
        <div className="flex items-center gap-1">
          <SkeletonIcon size="sm" />
          <SkeletonText width="w-20" />
        </div>
      </div>
    </div>
  </div>
);

export default HeaderSkeleton;
