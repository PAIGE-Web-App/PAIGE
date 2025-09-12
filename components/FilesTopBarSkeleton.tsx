import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonIcon, SkeletonButton } from './skeletons/SkeletonBase';

const FilesTopBarSkeleton: React.FC = () => (
  <SkeletonBase className="bg-white border-b border-[#E0DBD7] p-6 flex-shrink-0">
    <div className="flex items-center gap-4">
      {/* Left Side - Folder Name and Controls */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Folder Name */}
        <SkeletonTitle width="w-48" />
        
        {/* Folder Controls */}
        <div className="flex items-center gap-2">
          <SkeletonIcon size="md" />
          <SkeletonIcon size="md" />
          <SkeletonIcon size="md" />
          <div className="w-px h-4 bg-[#E0DBD7]" />
        </div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 flex justify-center">
        <SkeletonIcon size="md" />
      </div>

      {/* Right Side - View Toggle and Add File */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* View Mode Toggle */}
        <div className="flex bg-[#F8F6F4] rounded-[5px] p-1">
          <SkeletonIcon size="md" className="rounded-[3px]" />
          <SkeletonIcon size="md" className="rounded-[3px]" />
        </div>

        {/* Add File Button */}
        <SkeletonButton width="w-20" height="h-8" />
      </div>
    </div>
  </SkeletonBase>
);

export default FilesTopBarSkeleton; 