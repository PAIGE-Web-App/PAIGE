import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonText, SkeletonButton } from './skeletons/SkeletonBase';

const FileItemSkeleton: React.FC = () => (
  <SkeletonBase className="bg-white border border-[#E0DBD7] rounded-[5px] p-4 flex flex-col items-start relative h-full min-h-[320px]">
    {/* File Preview Skeleton */}
    <div className="w-full min-h-[128px] h-32 bg-[#F3F2F0] rounded mb-2" />
    
    <div className="flex-1 w-full flex flex-col justify-between">
      <div>
        {/* File Name Skeleton */}
        <SkeletonTitle width="w-3/4" className="mb-2" />
        
        {/* File Description Skeleton */}
        <SkeletonText width="w-full" lines={1} className="mb-1" />
        <SkeletonText width="w-2/3" lines={1} className="mb-2" />
        
        {/* File Metadata Skeleton */}
        <div className="flex items-center gap-2 mb-2">
          <SkeletonText width="w-16" lines={1} />
          <SkeletonText width="w-20" lines={1} />
        </div>
        
        {/* Folder Badge Skeleton */}
        <SkeletonText width="w-24" lines={1} className="mb-2" />
      </div>
    </div>
    
    {/* Action Buttons Skeleton */}
    <div className="flex gap-2 w-full mt-auto">
      <SkeletonButton width="flex-1" height="h-8" />
      <SkeletonButton width="flex-1" height="h-8" />
    </div>
  </SkeletonBase>
);

export default FileItemSkeleton; 