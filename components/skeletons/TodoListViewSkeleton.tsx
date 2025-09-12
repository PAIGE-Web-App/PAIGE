import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonButton, SkeletonIcon } from './SkeletonBase';

const TodoListViewSkeleton: React.FC = () => (
  <SkeletonBase className="flex-1 bg-white">
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <SkeletonText width="w-40" height="h-6" />
        <SkeletonButton width="w-24" height="h-8" />
      </div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 border border-[#E0DBD7] rounded-[5px]">
            <SkeletonIcon size="sm" />
            <div className="flex-1">
              <SkeletonText width="w-3/4" height="h-4" className="mb-1" />
              <SkeletonText width="w-1/2" height="h-3" />
            </div>
            <SkeletonButton width="w-6" height="h-6" />
          </div>
        ))}
      </div>
    </div>
  </SkeletonBase>
);

export default TodoListViewSkeleton;
