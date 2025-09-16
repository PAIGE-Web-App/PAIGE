import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonButton } from './SkeletonBase';

const TodoTopBarSkeleton: React.FC = () => (
  <SkeletonBase className="h-16 bg-white border-b border-[#AB9C95]">
    <div className="flex items-center justify-between h-full px-4">
      <SkeletonText width="w-32" />
      <div className="flex items-center gap-2">
        <SkeletonButton width="w-20" height="h-8" />
        <SkeletonButton width="w-24" height="h-8" />
      </div>
    </div>
  </SkeletonBase>
);

export default TodoTopBarSkeleton;
