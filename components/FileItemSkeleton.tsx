import React from 'react';

const FileItemSkeleton: React.FC = () => (
  <div className="bg-white border border-[#E0DBD7] rounded-[5px] p-4 flex flex-col items-start relative h-full min-h-[320px] animate-pulse">
    {/* File Preview Skeleton */}
    <div className="w-full min-h-[128px] h-32 bg-gray-300 rounded mb-2" />
    
    <div className="flex-1 w-full flex flex-col justify-between">
      <div>
        {/* File Name Skeleton */}
        <div className="h-6 bg-gray-300 rounded w-3/4 mb-2" />
        
        {/* File Description Skeleton */}
        <div className="h-3 bg-gray-200 rounded w-full mb-1" />
        <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
        
        {/* File Metadata Skeleton */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-3 bg-gray-200 rounded w-20" />
        </div>
        
        {/* Folder Badge Skeleton */}
        <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
      </div>
    </div>
    
    {/* Action Buttons Skeleton */}
    <div className="flex gap-2 w-full mt-auto">
      <div className="h-8 bg-gray-200 rounded flex-1" />
      <div className="h-8 bg-gray-200 rounded flex-1" />
    </div>
  </div>
);

export default FileItemSkeleton; 