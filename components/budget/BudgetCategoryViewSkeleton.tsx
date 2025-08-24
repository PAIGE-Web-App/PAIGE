import React from 'react';

const BudgetCategoryViewSkeleton: React.FC = () => {
  return (
    <>
      {/* Budget Top Bar Skeleton */}
      <div className="lg:block">
        <div className="h-16 bg-white border-b border-[#AB9C95] animate-pulse">
          <div className="flex items-center justify-between h-full px-6">
            <div className="flex items-center gap-4">
              <div className="h-6 bg-gray-300 rounded w-32 animate-pulse" />
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 bg-gray-300 rounded w-24 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation Skeleton */}
      <div className="px-6 py-3 border-b border-[#E0DBD7] bg-white">
        <div className="flex items-center text-xs text-[#A85C36]">
          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
          <span className="mx-2 text-[#AB9C95]">/</span>
          <div className="h-3 bg-gray-300 rounded w-32 animate-pulse" />
        </div>
      </div>

      {/* Budget Metrics Skeleton */}
      <div className="bg-white border-b border-[#AB9C95]">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-4">
          {/* Category Budget Card Skeleton */}
          <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4 min-h-40 relative animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-32 mb-2" />
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-6 bg-gray-300 rounded w-16 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-40" />
            </div>
            <div className="absolute top-3 right-3 w-6 h-6 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Overall Budget Card Skeleton */}
          <div className="border border-[#E0DBD7] rounded-[5px] p-4 bg-white min-h-40 relative animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-28 mb-2" />
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-6 bg-gray-300 rounded w-20 mb-2" />
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
            <div className="absolute top-3 right-3 w-6 h-6 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Remaining Budget Card Skeleton */}
          <div className="border border-[#E0DBD7] rounded-[5px] p-4 bg-white min-h-40 relative animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-32 mb-2" />
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-6 bg-gray-300 rounded w-20 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-3 bg-green-200 rounded w-16" />
            </div>
            <div className="absolute top-3 right-3 w-6 h-6 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Budget Items List Skeleton */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 flex flex-col">
          {/* Empty State Skeleton */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse" />
              <div className="h-6 bg-gray-300 rounded w-48 mx-auto mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BudgetCategoryViewSkeleton;
