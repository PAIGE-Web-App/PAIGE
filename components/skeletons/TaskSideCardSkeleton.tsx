import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonButton, SkeletonIcon } from './SkeletonBase';

const TaskSideCardSkeleton: React.FC = () => (
  <SkeletonBase className="w-80 bg-white border-l border-[#AB9C95]">
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <SkeletonText width="w-32" />
        <SkeletonButton width="w-6" height="h-6" />
      </div>
      <div className="space-y-4">
        <div>
          <SkeletonText width="w-20" className="mb-2" />
          <SkeletonText width="w-full" className="mb-1" />
          <SkeletonText width="w-3/4" />
        </div>
        <div>
          <SkeletonText width="w-16" className="mb-2" />
          <SkeletonText width="w-full" className="mb-1" />
          <SkeletonText width="w-2/3" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonIcon size="sm" />
          <SkeletonText width="w-24" />
        </div>
      </div>
    </div>
  </SkeletonBase>
);

export default TaskSideCardSkeleton;
