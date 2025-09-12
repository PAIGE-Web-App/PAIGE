import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonText, SkeletonButton, SkeletonAvatar } from '@/components/skeletons/SkeletonBase';

const AccountTabSkeleton: React.FC = () => (
  <SkeletonBase className="space-y-6 pb-8">
    {/* Account Details Container */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <SkeletonTitle width="w-32" className="mb-6" />
      
      {/* Avatar section skeleton */}
      <div className="flex flex-col items-center mb-4">
        <SkeletonAvatar size="lg" className="mb-2" />
        <SkeletonText width="w-8" lines={1} />
      </div>
      
      {/* Form fields skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonText width="w-24" lines={1} />
            <SkeletonButton width="w-full" height="h-10" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Collaboration Banner skeleton */}
    <div className="bg-[#805d93] rounded-lg p-4">
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" className="bg-white/20" />
        <div className="space-y-2">
          <SkeletonTitle width="w-48" className="bg-white/20" />
          <SkeletonText width="w-64" lines={1} className="bg-white/20" />
        </div>
      </div>
    </div>
    
    {/* Partner Profile Container */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <SkeletonTitle width="w-32" className="mb-6" />
      <SkeletonText width="w-64" lines={1} className="mb-4" />
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonText width="w-20" lines={1} />
            <SkeletonButton width="w-full" height="h-10" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Wedding Planner Profile Container */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <SkeletonTitle width="w-40" className="mb-6" />
      <SkeletonText width="w-72" lines={1} className="mb-4" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonText width="w-28" lines={1} />
            <SkeletonButton width="w-full" height="h-10" />
          </div>
        ))}
      </div>
    </div>
    
    {/* Danger Zone Container */}
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <SkeletonTitle width="w-24" className="mb-6" />
      <div className="space-y-4">
        <SkeletonText width="w-48" lines={1} />
        <SkeletonButton width="w-32" height="h-8" className="bg-red-100" />
      </div>
    </div>
  </SkeletonBase>
);

export default AccountTabSkeleton; 