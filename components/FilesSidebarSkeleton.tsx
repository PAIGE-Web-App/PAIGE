import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonText, SkeletonIcon, SkeletonProgressBar, SkeletonButton } from './skeletons/SkeletonBase';

const FilesSidebarSkeleton: React.FC = () => (
  <SkeletonBase className="w-80 bg-white border-r border-[#E0DBD7] flex flex-col">
    {/* Header */}
    <div className="p-4 border-b border-[#E0DBD7]">
      <div className="flex items-center justify-between mb-4">
        <SkeletonTitle width="w-24" />
        <SkeletonButton width="w-20" height="h-7" />
      </div>
    </div>

    {/* Folders List */}
    <div className="flex-1 p-4 space-y-2">
      {/* All Files skeleton */}
      <div className="flex items-center px-3 py-2 rounded-[5px] border border-[#E0DBD7]">
        <SkeletonIcon size="sm" className="mr-2" />
        <SkeletonTitle width="w-16" className="flex-1" />
        <SkeletonIcon size="sm" className="rounded-full ml-2" />
      </div>

      {/* Folder skeletons */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center px-3 py-2 rounded-[5px]">
          <SkeletonIcon size="sm" className="mr-2" />
          <SkeletonTitle width="w-32" className="flex-1" />
          <SkeletonIcon size="sm" className="rounded-full ml-2" />
        </div>
      ))}

      {/* Subfolder skeletons with indentation */}
      {[...Array(2)].map((_, i) => (
        <div key={`sub-${i}`} className="flex items-center px-3 py-2 ml-4 rounded-[5px]">
          <SkeletonIcon size="sm" className="mr-2" />
          <SkeletonTitle width="w-24" className="flex-1" />
          <SkeletonIcon size="sm" className="rounded-full ml-2" />
        </div>
      ))}
    </div>

    {/* Storage Usage Footer */}
    <div className="p-4 border-t border-[#E0DBD7] bg-[#F8F6F4] flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <SkeletonText width="w-20" lines={1} />
        <SkeletonText width="w-12" lines={1} />
      </div>
      <SkeletonProgressBar className="mb-1" />
      <div className="flex justify-between">
        <SkeletonText width="w-16" lines={1} />
        <SkeletonText width="w-8" lines={1} />
      </div>
    </div>
  </SkeletonBase>
);

export default FilesSidebarSkeleton; 