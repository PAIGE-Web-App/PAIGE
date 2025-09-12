import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonIcon } from './skeletons/SkeletonBase';

const TodoItemSkeleton: React.FC = () => (
  <SkeletonBase className="flex items-center gap-3 p-3 mb-2 rounded-[5px] border border-[#AB9C95] bg-gray-100">
    {/* Checkbox skeleton */}
    <SkeletonIcon size="md" className="rounded-full flex-shrink-0" />
    {/* Main content skeleton */}
    <div className="flex-1">
      <SkeletonText width="w-2/3" lines={1} className="mb-1" />
      <SkeletonText width="w-1/3" lines={1} />
    </div>
    {/* Optional right-side icon skeleton */}
    <SkeletonIcon size="sm" className="ml-2" />
  </SkeletonBase>
);

export default TodoItemSkeleton; 