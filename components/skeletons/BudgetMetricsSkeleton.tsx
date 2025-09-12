import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonText, SkeletonCard } from './SkeletonBase';

const BudgetMetricsSkeleton: React.FC = () => (
  <SkeletonBase className="bg-white border-b border-[#AB9C95]">
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-4">
      {/* Category Budget Card Skeleton */}
      <SkeletonCard className="bg-[#F8F6F4] min-h-40 relative">
        <SkeletonTitle width="w-32" className="mb-2" />
        <div className="flex-1 flex flex-col justify-center">
          <SkeletonTitle width="w-16" className="mb-2" />
          <SkeletonText width="w-48" lines={1} className="mb-2" />
          <SkeletonText width="w-40" lines={1} />
        </div>
        <div className="absolute top-3 right-3 w-6 h-6 bg-[#F3F2F0] rounded" />
      </SkeletonCard>

      {/* Overall Budget Card Skeleton */}
      <SkeletonCard className="min-h-40 relative">
        <SkeletonTitle width="w-28" className="mb-2" />
        <div className="flex-1 flex flex-col justify-center">
          <SkeletonTitle width="w-20" className="mb-2" />
          <div className="w-full bg-[#E0DBD7] rounded-full h-1.5 mb-2">
            <div className="h-1.5 bg-[#F3F2F0] rounded-full w-2/3" />
          </div>
          <SkeletonText width="w-48" lines={1} />
        </div>
        <div className="absolute top-3 right-3 w-6 h-6 bg-[#F3F2F0] rounded" />
      </SkeletonCard>

      {/* Remaining Budget Card Skeleton */}
      <SkeletonCard className="min-h-40 relative">
        <SkeletonTitle width="w-28" className="mb-2" />
        <div className="flex-1 flex flex-col justify-center">
          <SkeletonTitle width="w-20" className="mb-2" />
          <SkeletonText width="w-48" lines={1} />
        </div>
        <div className="absolute top-3 right-3 w-6 h-6 bg-[#F3F2F0] rounded" />
      </SkeletonCard>
    </div>
  </SkeletonBase>
);

export default BudgetMetricsSkeleton;
