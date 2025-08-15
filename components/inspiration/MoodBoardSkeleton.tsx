import React from 'react';

const MoodBoardSkeleton: React.FC = () => (
  <div className="animate-pulse">
    {/* Only skeleton for dynamic content that needs loading time */}
    
    {/* Mood Board Content Skeleton - Only for the dynamic parts */}
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      {/* Board Name Skeleton - Only if board data is loading */}
      <div className="mb-4">
        <div className="h-6 bg-gray-300 rounded w-48" />
      </div>

      {/* Vibes Section Skeleton - Only if vibes are loading */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-6 bg-gray-200 rounded-full w-20" />
          <div className="h-6 bg-gray-200 rounded-full w-24" />
          <div className="h-6 bg-gray-200 rounded-full w-28" />
          <div className="h-6 bg-gray-200 rounded-full w-16" />
        </div>
      </div>

      {/* Image Grid Skeleton - Only for uploaded images that need loading */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4 mb-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="break-inside-avoid mb-4">
            <div className="bg-white border border-[#AB9C95] rounded-[5px] overflow-hidden">
              {/* Image Skeleton - This is what actually needs loading time */}
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
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Button Skeleton */}
      <div className="mt-6 flex justify-center">
        <div className="h-10 bg-gray-200 rounded-lg w-48" />
      </div>
    </div>
  </div>
);

export default MoodBoardSkeleton;
