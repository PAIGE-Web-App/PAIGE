import React from 'react';

const BudgetOverviewSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header Skeleton */}
      <div className="p-4 border-b border-[#E0DBD7] bg-white">
        <div className="h-6 bg-gray-300 rounded w-48 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-80 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Left Column - Charts and Summary */}
          <div className="space-y-4">
            {/* Budget Chart Section Skeleton */}
            <div className="bg-white p-4 rounded-[10px] border border-[#E0DBD7]">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 bg-gray-300 rounded w-48 animate-pulse" />
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex items-center justify-center h-64">
                <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Key Metrics Skeleton */}
            <div className="bg-white p-4 rounded-[10px] border border-[#E0DBD7]">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 bg-gray-300 rounded w-24 animate-pulse" />
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="grid gap-4 grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center">
                    <div className="h-6 bg-gray-300 rounded w-20 mx-auto mb-2 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-24 mx-auto animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Category Breakdown */}
          <div className="space-y-4">
            {/* Category Breakdown Skeleton */}
            <div className="bg-white p-4 rounded-[10px] border border-[#E0DBD7]">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 bg-gray-300 rounded w-36 animate-pulse" />
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border-b border-[#F3F2F0] pb-3 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-300 rounded-full animate-pulse" />
                        <div className="h-4 bg-gray-300 rounded w-24 animate-pulse" />
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 mr-3">
                        <div className="w-full bg-gray-200 rounded-full h-2 animate-pulse" />
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-12 animate-pulse" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Status Skeleton */}
            <div className="bg-white p-4 rounded-[10px] border border-[#E0DBD7]">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 bg-gray-300 rounded w-28 animate-pulse" />
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                    <div className="h-4 bg-gray-300 rounded w-16 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetOverviewSkeleton;
