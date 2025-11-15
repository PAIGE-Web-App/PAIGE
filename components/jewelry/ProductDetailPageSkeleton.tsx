"use client";

import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonTitle, SkeletonButton } from '@/components/skeletons/SkeletonBase';

export default function ProductDetailPageSkeleton() {
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
        <div className="app-content-container flex flex-col gap-4 py-8 pb-6">
          {/* Mobile Header Skeleton */}
          <div className="lg:hidden sticky top-0 z-10 bg-linen pt-6 -mx-4 px-4 mb-4">
            <SkeletonBase>
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 bg-[#F3F2F0] rounded" />
                <SkeletonTitle width="w-48" />
                <div className="w-7" />
              </div>
            </SkeletonBase>
          </div>

          {/* Desktop Header Skeleton */}
          <div className="hidden lg:flex items-center justify-between mb-4">
            <SkeletonBase>
              <SkeletonText width="w-32" lines={1} />
            </SkeletonBase>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Image Gallery Skeleton */}
            <div className="space-y-4">
              <SkeletonBase>
                <div className="aspect-square bg-[#F9F8F7] rounded-lg" />
              </SkeletonBase>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-20 h-20 bg-[#F3F2F0] rounded-md" />
                ))}
              </div>
            </div>

            {/* Product Details Skeleton */}
            <div className="space-y-6">
              <SkeletonBase>
                <SkeletonTitle width="w-64" className="mb-2" />
                <SkeletonText width="w-24" lines={1} className="mb-6" />
              </SkeletonBase>

              {/* Variants Skeleton */}
              <div>
                <SkeletonText width="w-32" lines={1} className="mb-2" />
                <div className="h-10 bg-[#F3F2F0] rounded-[5px] border border-[#E0DBD7]" />
              </div>

              {/* Buy Now Button Skeleton */}
              <SkeletonButton width="w-full" height="h-12" />

              {/* Description Skeleton */}
              <div className="border-t border-[#E0DBD7] pt-6">
                <SkeletonBase>
                  <SkeletonTitle width="w-32" className="mb-3" />
                  <SkeletonText width="w-full" lines={4} />
                </SkeletonBase>
              </div>

              {/* Tags Skeleton */}
              <div className="border-t border-[#E0DBD7] pt-6">
                <SkeletonBase>
                  <SkeletonTitle width="w-16" className="mb-2" />
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-6 w-20 bg-[#F3F2F0] rounded" />
                    ))}
                  </div>
                </SkeletonBase>
              </div>
            </div>
          </div>

          {/* Reviews Section Skeleton */}
          <div className="border-t border-[#E0DBD7] pt-8 mt-8">
            <SkeletonBase>
              <SkeletonTitle width="w-32" className="mb-6" />
              <div className="text-center py-8 bg-white rounded-lg border border-[#E0DBD7]">
                <div className="w-12 h-12 bg-[#F3F2F0] rounded-full mx-auto mb-3" />
                <SkeletonText width="w-48" lines={1} className="mx-auto mb-2" />
                <SkeletonText width="w-64" lines={1} className="mx-auto mb-4" />
                <SkeletonButton width="w-48" height="h-10" />
              </div>
            </SkeletonBase>
          </div>
        </div>
      </div>
    </div>
  );
}

