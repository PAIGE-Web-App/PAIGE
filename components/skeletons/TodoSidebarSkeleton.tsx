import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonButton } from './SkeletonBase';

const TodoSidebarSkeleton: React.FC = () => (
  <SkeletonBase className="w-64 bg-[#F3F2F0]">
    <div className="p-4">
      <SkeletonText width="w-3/4" className="mb-4" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-2">
            <SkeletonText width="w-1/2" />
            <SkeletonButton width="w-6" height="h-6" />
          </div>
        ))}
      </div>
    </div>
  </SkeletonBase>
);

export default TodoSidebarSkeleton;
