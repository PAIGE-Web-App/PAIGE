import React from 'react';
import { SkeletonBase, SkeletonText } from './SkeletonBase';

const MessagesSkeleton: React.FC = () => (
  <SkeletonBase className="space-y-4 p-3">
    {/* Received Message Skeleton */}
    <div className="max-w-[80%] px-3 py-2 rounded-[15px_15px_15px_0] mr-auto bg-gray-50">
      <SkeletonText width="w-1/2" height="h-3" className="mb-1" />
      <SkeletonText width="w-full" height="h-4" />
      <SkeletonText width="w-4/5" height="h-4" className="mt-1" />
    </div>

    {/* Sent Message Skeleton */}
    <div className="max-w-[80%] px-3 py-2 rounded-[15px_15px_0_15px] ml-auto bg-gray-100">
      <SkeletonText width="w-2/3" height="h-3" className="mb-1 ml-auto" />
      <SkeletonText width="w-full" height="h-4" />
      <SkeletonText width="w-3/4" height="h-4" className="mt-1 ml-auto" />
    </div>
  </SkeletonBase>
);

export default MessagesSkeleton;
