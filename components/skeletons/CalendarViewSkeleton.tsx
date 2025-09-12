import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonButton } from './SkeletonBase';

const CalendarViewSkeleton: React.FC = () => (
  <SkeletonBase className="flex-1 bg-white">
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <SkeletonText width="w-32" height="h-6" />
        <div className="flex gap-2">
          <SkeletonButton width="w-20" height="h-8" />
          <SkeletonButton width="w-24" height="h-8" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {[...Array(7)].map((_, i) => (
          <SkeletonText key={i} width="w-full" height="h-8" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {[...Array(35)].map((_, i) => (
          <div key={i} className="h-20 border border-[#E0DBD7] rounded">
            <SkeletonText width="w-3/4" height="h-3" className="m-1" />
            <SkeletonText width="w-1/2" height="h-3" className="m-1" />
          </div>
        ))}
      </div>
    </div>
  </SkeletonBase>
);

export default CalendarViewSkeleton;
