"use client";

import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonTitle, SkeletonCard } from '@/components/skeletons/SkeletonBase';
import ProductCardSkeleton from './ProductCardSkeleton';

export default function CollectionDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-linen mobile-scroll-container">
      <style jsx global>{`
        @media (max-width: 768px) {
          html, body {
            height: 100vh;
            overflow: hidden;
          }
          .mobile-scroll-container {
            height: 100vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
      
      <div className="max-w-6xl mx-auto">
        <div className="app-content-container flex flex-col gap-2 py-4 pb-4">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-4">
            <SkeletonBase>
              <SkeletonText width="w-20" lines={1} />
            </SkeletonBase>
            <span className="text-[#7A7A7A]">/</span>
            <SkeletonBase>
              <SkeletonText width="w-24" lines={1} />
            </SkeletonBase>
            <span className="text-[#7A7A7A]">/</span>
            <SkeletonBase>
              <SkeletonText width="w-32" lines={1} />
            </SkeletonBase>
          </div>

          {/* Collection Header Skeleton */}
          <div className="mb-6">
            <SkeletonBase>
              <SkeletonTitle width="w-48 md:w-64" className="mb-2" />
            </SkeletonBase>
          </div>

          {/* Search Bar Skeleton */}
          <div className="sticky top-0 z-30 bg-[#F3F2F0] pt-4 pb-3 -mx-4 px-4 mb-2">
            <SkeletonBase>
              <div className="h-10 bg-white rounded-[5px] border border-[#E0DBD7]" />
            </SkeletonBase>
          </div>

          {/* Main Content: Filters + Products */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Filters Sidebar Skeleton */}
            <div className="lg:col-span-1">
              <SkeletonCard className="sticky top-6">
                <SkeletonBase>
                  <div className="space-y-6">
                    {/* Price Filter Skeleton */}
                    <div className="border-b border-[#E0DBD7] pb-4">
                      <SkeletonTitle width="w-20" className="mb-3" />
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="h-8 bg-[#F3F2F0] rounded flex-1" />
                          <div className="h-8 bg-[#F3F2F0] rounded flex-1" />
                        </div>
                        <div className="h-2 bg-[#E0DBD7] rounded-full" />
                      </div>
                    </div>

                    {/* Style Filter Skeleton */}
                    <div className="border-b border-[#E0DBD7] pb-4">
                      <SkeletonTitle width="w-16" className="mb-3" />
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-center justify-between">
                            <SkeletonText width="w-20" lines={1} />
                            <SkeletonText width="w-8" lines={1} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metal Filter Skeleton */}
                    <div className="border-b border-[#E0DBD7] pb-4">
                      <SkeletonTitle width="w-16" className="mb-3" />
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-center justify-between">
                            <SkeletonText width="w-24" lines={1} />
                            <SkeletonText width="w-8" lines={1} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Type Filter Skeleton */}
                    <div className="pb-4">
                      <SkeletonTitle width="w-12" className="mb-3" />
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-center justify-between">
                            <SkeletonText width="w-20" lines={1} />
                            <SkeletonText width="w-8" lines={1} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SkeletonBase>
              </SkeletonCard>
            </div>

            {/* Products Grid Skeleton */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <ProductCardSkeleton key={`skeleton-${i}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

