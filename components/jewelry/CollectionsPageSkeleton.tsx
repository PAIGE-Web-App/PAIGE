"use client";

import React from 'react';
import { SkeletonBase, SkeletonText, SkeletonTitle } from '@/components/skeletons/SkeletonBase';
import ProductCardSkeleton from './ProductCardSkeleton';

export default function CollectionsPageSkeleton() {
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
      
      {/* Hero Section Skeleton */}
      <div className="relative w-full h-[300px] md:h-[400px] bg-[#F3F2F0]">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <SkeletonBase>
            <SkeletonTitle width="w-64 md:w-80" className="mb-4" />
            <SkeletonText width="w-80 md:w-[500px]" lines={1} className="mb-4" />
          </SkeletonBase>
        </div>
      </div>

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
          </div>

          {/* Header Skeleton */}
          <div className="mb-6">
            <SkeletonBase>
              <SkeletonTitle width="w-48" className="mb-2" />
              <SkeletonText width="w-64" lines={1} />
            </SkeletonBase>
          </div>

          {/* Collections Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <ProductCardSkeleton key={`collection-skeleton-${i}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

