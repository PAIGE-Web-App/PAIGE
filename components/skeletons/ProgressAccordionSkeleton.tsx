import React from 'react';
import { SkeletonBase, SkeletonCard, SkeletonTitle, SkeletonText, SkeletonButton, SkeletonIcon } from './SkeletonBase';

export default function ProgressAccordionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Wedding Related Section Skeleton */}
      <div>
        <SkeletonBase>
          <SkeletonTitle className="mb-4 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={`wedding-${index}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <SkeletonIcon size="md" className="p-2 rounded-lg" />
                    <div className="flex-1">
                      <SkeletonTitle className="w-48 mb-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-5 bg-[#F3F2F0] rounded-full" />
                    <SkeletonIcon size="sm" />
                  </div>
                </div>
              </SkeletonCard>
            ))}
          </div>
        </SkeletonBase>
      </div>

      {/* General Functions Section Skeleton */}
      <div>
        <SkeletonBase>
          <SkeletonTitle className="mb-4 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <SkeletonCard key={`general-${index}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <SkeletonIcon size="md" className="p-2 rounded-lg" />
                    <div className="flex-1">
                      <SkeletonTitle className="w-40 mb-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-5 bg-[#F3F2F0] rounded-full" />
                    <SkeletonIcon size="sm" />
                  </div>
                </div>
              </SkeletonCard>
            ))}
          </div>
        </SkeletonBase>
      </div>
    </div>
  );
}
