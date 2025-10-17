'use client';

import React from 'react';
import { SkeletonBase, SkeletonCard, SkeletonText, SkeletonTitle, SkeletonButton, SkeletonAvatar } from '@/components/skeletons/SkeletonBase';

export default function TimelinePageSkeleton() {
  return (
    <div className="flex flex-col h-full bg-linen">
      <div className="app-content-container flex-1 overflow-hidden">
        <div className="flex h-full gap-4 lg:flex-row flex-col">
          {/* Sidebar Skeleton */}
          <div className="unified-container">
            <div className="bg-white border-r border-gray-200 p-4 h-full">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between mb-6">
                <SkeletonTitle width="w-20" />
                <SkeletonButton width="w-16" height="h-8" />
              </div>
              
              {/* Timeline Cards */}
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <SkeletonTitle width="w-24" className="mb-2" />
                        <SkeletonText lines={1} width="w-16" className="text-xs" />
                      </div>
                      <SkeletonAvatar size="sm" />
                    </div>
                  </SkeletonCard>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="unified-main-content">
            {/* Top Bar Skeleton */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SkeletonTitle width="w-32" />
                  <SkeletonText lines={1} width="w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <SkeletonButton width="w-20" height="h-8" />
                  <SkeletonButton width="w-16" height="h-8" />
                </div>
              </div>
            </div>

            {/* Wedding Date Bar Skeleton */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <SkeletonText lines={1} width="w-40" />
            </div>

            {/* Calendar Sync Skeleton */}
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="bg-[#F8F6F4] rounded px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#F3F2F0] rounded" />
                    <SkeletonText lines={1} width="w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SkeletonButton width="w-12" height="h-4" />
                    <div className="w-1 h-1 bg-[#F3F2F0] rounded-full" />
                    <SkeletonButton width="w-8" height="h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Events Skeleton */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <SkeletonText lines={1} width="w-20" />
                        <div className="w-1 h-1 bg-[#F3F2F0] rounded-full" />
                        <SkeletonText lines={1} width="w-16" />
                      </div>
                      <div className="w-4 h-4 bg-[#F3F2F0] rounded" />
                    </div>
                    <SkeletonTitle width="w-48" className="mb-2" />
                    <SkeletonText lines={2} width="w-full" />
                  </SkeletonCard>
                ))}
              </div>
            </div>

            {/* Fixed Footer Skeleton */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <SkeletonText lines={1} width="w-32" />
                <SkeletonText lines={1} width="w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
