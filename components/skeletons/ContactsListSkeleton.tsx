import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonAvatar } from './SkeletonBase';

const ContactsListSkeleton: React.FC = () => (
  <SkeletonBase className="space-y-2 p-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="p-3 mb-3 rounded-[5px] border border-[#AB9C95] bg-gray-100">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="sm" />
          <div className="flex-1">
            <SkeletonText width="w-24" className="mb-1" />
            <SkeletonText width="w-16" />
          </div>
        </div>
      </div>
    ))}
  </SkeletonBase>
);

export default ContactsListSkeleton;
