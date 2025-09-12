import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonText, SkeletonCard, SkeletonIcon, SkeletonProgressBar } from '../skeletons/SkeletonBase';

const BudgetOverviewSkeleton: React.FC = () => {
  return (
    <SkeletonBase className="flex-1 flex flex-col min-h-0">
      {/* Header Skeleton */}
      <div className="p-4 border-b border-[#E0DBD7] bg-white">
        <SkeletonTitle width="w-48" className="mb-2" />
        <SkeletonText width="w-80" lines={1} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Left Column - Charts and Summary */}
          <div className="space-y-4">
            {/* Budget Chart Section Skeleton */}
            <SkeletonCard className="p-4 rounded-[10px]">
              <div className="flex items-center justify-between mb-4">
                <SkeletonTitle width="w-48" />
                <SkeletonIcon size="md" />
              </div>
              <div className="flex items-center justify-center h-64">
                <div className="w-32 h-32 bg-[#F3F2F0] rounded-full" />
              </div>
            </SkeletonCard>

            {/* Key Metrics Skeleton */}
            <SkeletonCard className="p-4 rounded-[10px]">
              <div className="flex items-center justify-between mb-4">
                <SkeletonTitle width="w-24" />
                <SkeletonIcon size="md" />
              </div>
              <div className="grid gap-4 grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center">
                    <SkeletonTitle width="w-20" className="mx-auto mb-2" />
                    <SkeletonText width="w-24" lines={1} className="mx-auto" />
                  </div>
                ))}
              </div>
            </SkeletonCard>
          </div>

          {/* Right Column - Category Breakdown */}
          <div className="space-y-4">
            {/* Category Breakdown Skeleton */}
            <SkeletonCard className="p-4 rounded-[10px]">
              <div className="flex items-center justify-between mb-4">
                <SkeletonTitle width="w-36" />
                <SkeletonIcon size="md" />
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border-b border-[#F3F2F0] pb-3 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <SkeletonIcon size="sm" className="rounded-full" />
                        <SkeletonTitle width="w-24" />
                      </div>
                      <SkeletonText width="w-20" lines={1} />
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 mr-3">
                        <SkeletonProgressBar />
                      </div>
                      <SkeletonText width="w-12" lines={1} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <SkeletonText width="w-16" lines={1} />
                      <SkeletonText width="w-20" lines={1} />
                    </div>
                  </div>
                ))}
              </div>
            </SkeletonCard>

            {/* Budget Status Skeleton */}
            <SkeletonCard className="p-4 rounded-[10px]">
              <div className="flex items-center justify-between mb-4">
                <SkeletonTitle width="w-28" />
                <SkeletonIcon size="md" />
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <SkeletonText width="w-32" lines={1} />
                    <SkeletonTitle width="w-16" />
                  </div>
                ))}
              </div>
            </SkeletonCard>
          </div>
        </div>
      </div>
    </SkeletonBase>
  );
};

export default BudgetOverviewSkeleton;
