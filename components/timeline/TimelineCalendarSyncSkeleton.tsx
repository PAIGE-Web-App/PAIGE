'use client';

import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonButton } from '@/components/skeletons/SkeletonBase';

export default function TimelineCalendarSyncSkeleton() {
  return (
    <SkeletonBase>
      <div className="bg-[#F8F6F4] rounded px-3 py-2">
        <div className="flex items-center justify-between w-full">
          {/* Left: Google Calendar status skeleton */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#F3F2F0] rounded flex-shrink-0" />
            <SkeletonText lines={1} width="w-24" />
          </div>
          
          {/* Right: Action buttons skeleton */}
          <div className="flex items-center gap-2">
            <SkeletonButton width="w-12" height="h-4" />
            <div className="w-1 h-1 bg-[#F3F2F0] rounded-full"></div>
            <SkeletonButton width="w-8" height="h-4" />
          </div>
        </div>
      </div>
    </SkeletonBase>
  );
}
