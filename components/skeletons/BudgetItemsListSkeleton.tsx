import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonText, SkeletonButton } from './SkeletonBase';

const BudgetItemsListSkeleton: React.FC = () => (
  <SkeletonBase className="flex-1 bg-white">
    {/* Header */}
    <div className="p-4 border-b border-[#E0DBD7]">
      <div className="flex items-center justify-between mb-2">
        <SkeletonTitle width="w-32" />
        <SkeletonButton width="w-20" height="h-8" />
      </div>
      <SkeletonText width="w-48" lines={1} />
    </div>

    {/* Table */}
    <div className="p-4">
      {/* Table Header */}
      <div className="grid grid-cols-3 gap-4 mb-4 pb-2 border-b border-[#E0DBD7]">
        <SkeletonTitle width="w-20" />
        <SkeletonTitle width="w-16" />
        <SkeletonTitle width="w-16" />
      </div>

      {/* Table Rows */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-4 py-2">
            <SkeletonText width="w-32" lines={1} />
            <SkeletonText width="w-16" lines={1} />
            <div className="flex gap-2">
              <SkeletonButton width="w-8" height="h-6" />
              <SkeletonButton width="w-8" height="h-6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </SkeletonBase>
);

export default BudgetItemsListSkeleton;
