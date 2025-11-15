"use client";

import React from 'react';

export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#E0DBD7] overflow-hidden animate-pulse">
      {/* Image Skeleton */}
      <div className="relative aspect-square bg-[#F9F8F7]">
        <div className="w-full h-full bg-gray-200" />
      </div>

      {/* Content Skeleton */}
      <div className="p-4">
        {/* Title Skeleton */}
        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
        <div className="h-4 bg-gray-200 rounded mb-3 w-1/2" />
        
        {/* Reviews Skeleton */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-3 h-3 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="h-3 bg-gray-200 rounded w-8 ml-1" />
        </div>
        
        {/* Price Skeleton */}
        <div className="h-5 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}

