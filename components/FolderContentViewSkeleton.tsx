import React from 'react';

const FolderContentViewSkeleton: React.FC = () => (
  <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6 animate-pulse">
    {/* Breadcrumb Skeleton */}
    <div className="flex items-center gap-2 text-sm px-6 py-3 bg-[#F8F6F4] border-b border-[#E0DBD7]">
      <div className="w-4 h-4 bg-gray-300 rounded" />
      <div className="h-4 bg-gray-300 rounded w-24" />
      <div className="w-4 h-4 bg-gray-300 rounded" />
      <div className="h-4 bg-gray-300 rounded w-32" />
    </div>

    {/* Subfolders Section */}
    <div className="bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[#E0DBD7] bg-[#F8F6F4]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded" />
          <div className="h-4 bg-gray-300 rounded w-20" />
          <div className="w-6 h-5 bg-gray-200 rounded-full" />
        </div>
        <div className="h-7 bg-gray-200 rounded w-24" />
      </div>
      
      <div className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-[#E0DBD7] rounded-[5px]">
              <div className="w-5 h-5 bg-gray-300 rounded flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-300 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Files Section */}
    <div className="bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[#E0DBD7] bg-[#F8F6F4]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded" />
          <div className="h-4 bg-gray-300 rounded w-12" />
          <div className="w-6 h-5 bg-gray-200 rounded-full" />
        </div>
        <div className="h-7 bg-gray-200 rounded w-20" />
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-[#E0DBD7] rounded-[5px]">
              <div className="w-5 h-5 bg-gray-300 rounded flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-300 rounded w-32 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded" />
                <div className="w-6 h-6 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default FolderContentViewSkeleton; 