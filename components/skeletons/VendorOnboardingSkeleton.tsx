import React from 'react';
import { SkeletonBase, SkeletonTitle, SkeletonText, SkeletonButton, SkeletonCard, SkeletonIcon } from './SkeletonBase';

export default function VendorOnboardingSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header Skeleton */}
      <div className="flex-shrink-0 p-6 border-b border-[#E0DBD7]">
        <SkeletonBase>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <SkeletonIcon size="lg" className="rounded-full" />
              <div>
                <SkeletonTitle width="w-48" className="mb-2" />
                <SkeletonText width="w-32" lines={1} />
              </div>
            </div>
            <SkeletonButton width="w-24" height="h-8" />
          </div>
        </SkeletonBase>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Left Column - Vendor List */}
          <div className="w-1/3 border-r border-[#E0DBD7] p-4 overflow-y-auto">
            <SkeletonBase>
              {/* Banner Skeleton */}
              <SkeletonCard className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <SkeletonIcon size="sm" />
                  <SkeletonTitle width="w-40" />
                </div>
                <SkeletonText width="w-full" lines={2} />
              </SkeletonCard>

              {/* Title */}
              <SkeletonTitle width="w-48" className="mb-2" />
              <SkeletonText width="w-full" lines={1} className="mb-4" />

              {/* Category Tabs */}
              <div className="flex gap-2 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonButton key={i} width="w-16" height="h-8" />
                ))}
              </div>

              {/* Vendor Cards */}
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i}>
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-[#F3F2F0] rounded-lg flex-shrink-0" />
                      <div className="flex-1">
                        <SkeletonTitle width="w-3/4" className="mb-2" />
                        <SkeletonText width="w-1/2" lines={1} className="mb-1" />
                        <SkeletonText width="w-1/3" lines={1} />
                      </div>
                      <SkeletonIcon size="md" className="rounded-full" />
                    </div>
                  </SkeletonCard>
                ))}
              </div>
            </SkeletonBase>
          </div>

          {/* Middle Column - Vendor Details */}
          <div className="w-1/3 border-r border-[#E0DBD7] p-4">
            <SkeletonBase>
              <div className="text-center py-8">
                <SkeletonIcon size="lg" className="rounded-full mx-auto mb-4" />
                <SkeletonTitle width="w-48" className="mb-2" />
                <SkeletonText width="w-32" lines={1} />
              </div>
            </SkeletonBase>
          </div>

          {/* Right Column - Map */}
          <div className="w-1/3 p-4">
            <SkeletonBase>
              <SkeletonCard className="h-full">
                <div className="h-full bg-[#F3F2F0] rounded-lg flex items-center justify-center">
                  <SkeletonIcon size="lg" />
                </div>
              </SkeletonCard>
            </SkeletonBase>
          </div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="flex-shrink-0 p-6 border-t border-[#E0DBD7]">
        <SkeletonBase>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Stepper */}
              <div className="flex items-center gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#F3F2F0] rounded-full" />
                    {i < 2 && <div className="w-4 h-0.5 bg-[#F3F2F0]" />}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <SkeletonIcon size="sm" />
                <SkeletonText width="w-16" lines={1} />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <SkeletonButton width="w-24" height="h-9" />
              <SkeletonButton width="w-20" height="h-9" />
            </div>
          </div>
        </SkeletonBase>
      </div>
    </div>
  );
}
