import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonText, SkeletonCard, SkeletonButton } from './SkeletonBase';

const BudgetSidebarSkeleton: React.FC = () => (
  <SkeletonBase className="w-[320px] bg-[#F3F2F0] rounded-lg p-4">
    {/* Header */}
    <div className="mb-6">
      <SkeletonTitle width="w-16" className="mb-2" />
      <SkeletonButton width="w-24" height="h-8" />
    </div>

    {/* Categories List */}
    <div className="space-y-3 mb-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-3 rounded-[5px] border border-[#E0DBD7] bg-white">
          <div className="flex items-center justify-between mb-2">
            <SkeletonTitle width="w-20" />
            <SkeletonText width="w-16" lines={1} />
          </div>
          <div className="w-full bg-[#E0DBD7] rounded-full h-1 mb-1">
            <div className="h-1 bg-[#F3F2F0] rounded-full w-3/4" />
          </div>
          <SkeletonText width="w-12" lines={1} />
        </div>
      ))}
    </div>

    {/* Total Budget Card */}
    <SkeletonCard>
      <SkeletonTitle width="w-24" className="mb-2" />
      <div className="flex-1 flex flex-col justify-center">
        <SkeletonTitle width="w-20" className="mb-2" />
        <div className="w-full bg-[#E0DBD7] rounded-full h-1.5 mb-2">
          <div className="h-1.5 bg-[#F3F2F0] rounded-full w-2/3" />
        </div>
        <SkeletonText width="w-32" lines={1} />
      </div>
    </SkeletonCard>
  </SkeletonBase>
);

export default BudgetSidebarSkeleton;
