import React, { memo, Suspense, lazy } from 'react';
import { SkeletonBase, SkeletonText, SkeletonTitle, SkeletonProgressBar } from '../skeletons/SkeletonBase';

// Lazy load the QuickGuideCards component
const QuickGuideCards = lazy(() => import('./QuickGuideCards'));

interface LazyQuickGuideCardsProps {
  userData: any;
  progressData: any;
  onOpenWelcomeModal?: () => void;
}

const LazyQuickGuideCards: React.FC<LazyQuickGuideCardsProps> = memo(({ 
  userData, 
  progressData, 
  onOpenWelcomeModal 
}) => {
  // Loading skeleton that matches the actual component structure
  const LoadingSkeleton = () => (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 overflow-hidden">
      {/* Header Section Skeleton */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <SkeletonTitle width="w-48" />
          </div>
          
          {/* Condensed Progress Bar Skeleton */}
          <div className="flex items-center gap-3 ml-4">
            <div className="flex items-center gap-2">
              <SkeletonText width="w-8" lines={1} />
              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                <div className="w-8 bg-gray-300 h-1.5 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="w-full lg:w-3/4 lg:pr-8">
            <SkeletonText width="w-full" lines={2} />
            <SkeletonText width="w-32" lines={1} />
          </div>
        </div>
      </div>

      {/* Guide Cards Grid Skeleton */}
      <div className="p-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <SkeletonBase key={index}>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-5 bg-gray-300 rounded"></div>
                  <SkeletonTitle width="w-24" />
                </div>
                <SkeletonText width="w-full" lines={2} />
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <SkeletonText width="w-20" lines={1} />
                </div>
              </div>
            </SkeletonBase>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <QuickGuideCards 
        userData={userData}
        progressData={progressData}
        onOpenWelcomeModal={onOpenWelcomeModal}
      />
    </Suspense>
  );
});

LazyQuickGuideCards.displayName = 'LazyQuickGuideCards';

export default LazyQuickGuideCards;
