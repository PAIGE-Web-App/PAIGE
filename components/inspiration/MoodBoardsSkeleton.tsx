import React from 'react';

const MoodBoardsSkeleton: React.FC = () => (
  <div className="app-content-container flex flex-col gap-6 py-8 animate-pulse">
    {/* Page Header Skeleton */}
    <div className="mb-2">
      <div className="flex items-center justify-between">
        {/* Left side: Header and Description */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Heart icon skeleton */}
            <div className="w-5 h-5 bg-gray-300 rounded" />
            {/* Title skeleton */}
            <div className="h-6 bg-gray-300 rounded w-32" />
          </div>
          {/* Description skeleton */}
          <div className="h-4 bg-gray-200 rounded w-96 mb-1" />
        </div>
        
        {/* Right side: Storage Usage skeleton */}
        <div className="w-64 ml-10">
          <div className="border border-[#E0DBD7] rounded-[5px] p-4 bg-white">
            {/* Storage title and plan */}
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>
            
            {/* Progress bar skeleton */}
            <div className="w-full bg-[#F3F2F0] rounded-full h-2 mb-2">
              <div className="h-2 bg-gray-300 rounded-full w-1/4" />
            </div>
            
            {/* Usage details skeleton */}
            <div className="flex items-center justify-between text-sm">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Border line skeleton */}
    <div className="h-px bg-gray-200 mb-2" />

    {/* Mood Board Section Skeleton */}
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          {/* Mood Board Tabs Skeleton */}
          <div className="flex items-center gap-3">
            {/* Tab skeletons */}
            <div className="h-8 bg-gray-300 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-16" />
            {/* New board button skeleton */}
            <div className="h-8 bg-gray-300 rounded w-8" />
          </div>
          
          {/* Right side actions skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-8 bg-gray-200 rounded w-32" />
          </div>
        </div>
      </div>
      
      {/* Mood Board Content Skeleton */}
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        {/* Board name and controls skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-6 bg-gray-300 rounded w-32" />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 rounded" />
              <div className="w-5 h-5 bg-gray-200 rounded" />
            </div>
          </div>
        </div>

        {/* Vibes Section Skeleton */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Vibe pill skeletons */}
            <div className="h-6 bg-gray-200 rounded-full w-24" />
            <div className="h-6 bg-gray-200 rounded-full w-32" />
            <div className="h-6 bg-gray-200 rounded-full w-28" />
            <div className="h-6 bg-gray-200 rounded-full w-20" />
            {/* Edit button skeleton */}
            <div className="w-5 h-5 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Image Grid Skeleton */}
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4 mb-6">
          {/* Image skeleton items */}
          {[...Array(6)].map((_, index) => (
            <div key={index} className="break-inside-avoid mb-4">
              <div className="bg-white border border-[#AB9C95] rounded-[5px] overflow-hidden">
                {/* Image skeleton */}
                <div className="w-full h-48 bg-gray-300" />
                
                {/* Content below image skeleton */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-200 rounded" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                  
                  {/* Description skeleton */}
                  <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                  
                  {/* Category tag skeleton */}
                  <div className="h-5 bg-gray-200 rounded w-28" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Button Skeleton */}
        <div className="mt-6 flex gap-3 justify-center">
          <div className="h-10 bg-gray-200 rounded-lg w-40" />
        </div>
      </div>
    </div>
  </div>
);

export default MoodBoardsSkeleton;
