import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BudgetMetricsCard,
  BudgetDoughnutChart,
  BudgetProgressBar,
  CategoryBudgetCard,
  RemainingBudgetCard
} from './budget';

interface BudgetMetricsProps {
  selectedCategory: any;
  totalBudget: number | null;
  totalSpent: number;
  maxBudget: number | null;
  budgetItems?: any[];
  onEditCategory?: (category: any) => void;
  isLoading?: boolean;
}

const BudgetMetrics: React.FC<BudgetMetricsProps> = React.memo(({
  selectedCategory,
  totalBudget,
  totalSpent,
  maxBudget,
  budgetItems = [],
  onEditCategory,
  isLoading = false,
}) => {
  const router = useRouter();
  
  // Animation state for value updates
  const [animatingValues, setAnimatingValues] = useState<{
    categoryAllocated: boolean;
    totalBudget: boolean;
    maxBudget: boolean;
  }>({
    categoryAllocated: false,
    totalBudget: false,
    maxBudget: false,
  });
  
  // Refs to track previous values
  const prevValues = useRef({
    categoryAllocated: selectedCategory?.allocatedAmount || 0,
    totalBudget: totalBudget || 0,
    maxBudget: maxBudget || 0,
  });
  
  // Memoized calculations
  const remaining = useMemo(() => (maxBudget || 0) - totalSpent, [maxBudget, totalSpent]);
  
  // Calculate how many cards will be visible to determine grid layout
  const visibleCardCount = useMemo(() => {
    let count = 0;
    if (selectedCategory) count++; // Category Budget Card
    if (selectedCategory && budgetItems.length > 0) count++; // Budget Breakdown Card
    if (maxBudget) count++; // Remaining Budget Card
    count++; // Overall Budget Card (always visible)
    return count;
  }, [selectedCategory, budgetItems.length, maxBudget]);
  
  // Dynamic grid classes based on visible card count
  const gridClasses = useMemo(() => {
    if (visibleCardCount === 1) return 'grid-cols-1';
    if (visibleCardCount === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (visibleCardCount === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4'; // 4+ cards
  }, [visibleCardCount]);
  
  // Memoized callbacks
  const handleCategoryEdit = useCallback(() => {
    onEditCategory?.(selectedCategory);
  }, [onEditCategory, selectedCategory]);
  
  const handleMaxBudgetEdit = useCallback(() => {
    router.push('/settings?tab=wedding&highlight=maxBudget');
  }, [router]);

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="bg-white border-b border-[#AB9C95]">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-4">
          {/* Category Budget Card Skeleton */}
          <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4 min-h-40 relative animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-32 mb-2" />
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-6 bg-gray-300 rounded w-16 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-40" />
            </div>
            <div className="absolute top-3 right-3 w-6 h-6 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Overall Budget Card Skeleton */}
          <div className="border border-[#E0DBD7] rounded-[5px] p-4 bg-white min-h-40 relative animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-28 mb-2" />
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-6 bg-gray-300 rounded w-20 mb-2" />
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
            <div className="absolute top-3 right-3 w-6 h-6 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Remaining Budget Card Skeleton */}
          <div className="border border-[#E0DBD7] rounded-[5px] p-4 bg-white min-h-40 relative animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-32 mb-2" />
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-6 bg-gray-300 rounded w-20 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-3 bg-green-200 rounded w-16" />
            </div>
            <div className="absolute top-3 right-3 w-6 h-6 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  
  // Check for value changes and trigger animations
  useEffect(() => {
    const currentCategoryAllocated = selectedCategory?.allocatedAmount || 0;
    const currentTotalBudget = totalBudget || 0;
    const currentMaxBudget = maxBudget || 0;
    
    // Check if category allocated amount changed
    if (currentCategoryAllocated !== prevValues.current.categoryAllocated) {
      setAnimatingValues(prev => ({ ...prev, categoryAllocated: true }));
      setTimeout(() => setAnimatingValues(prev => ({ ...prev, categoryAllocated: false })), 600);
      prevValues.current.categoryAllocated = currentCategoryAllocated;
    }
    
    // Check if total budget changed
    if (currentTotalBudget !== prevValues.current.totalBudget) {
      setAnimatingValues(prev => ({ ...prev, totalBudget: true }));
      setTimeout(() => setAnimatingValues(prev => ({ ...prev, totalBudget: false })), 600);
      prevValues.current.totalBudget = currentTotalBudget;
    }
    
    // Check if max budget changed
    if (currentMaxBudget !== prevValues.current.maxBudget) {
      setAnimatingValues(prev => ({ ...prev, maxBudget: true }));
      setTimeout(() => setAnimatingValues(prev => ({ ...prev, maxBudget: false })), 600);
      prevValues.current.maxBudget = currentMaxBudget;
    }
  }, [selectedCategory?.allocatedAmount, totalBudget, maxBudget]);

  return (
    <div className="bg-white border-b border-[#AB9C95]">
      {/* Budget Overview Cards - {visibleCardCount} cards visible */}
      <div className={`grid gap-3 ${gridClasses} p-4`}>
        {/* Category Budget Card */}
        {selectedCategory && (
          <CategoryBudgetCard
            categoryName={selectedCategory.name}
            allocatedAmount={selectedCategory.allocatedAmount}
            totalSpent={selectedCategory.spentAmount || 0}
            remaining={selectedCategory.allocatedAmount - (selectedCategory.spentAmount || 0)}
            onEdit={handleCategoryEdit}
          />
        )}
        
        {/* Budget Breakdown Doughnut Chart */}
        {selectedCategory && budgetItems.length > 0 && (
          <BudgetMetricsCard title="Budget Breakdown">
            <div className="flex items-center justify-center h-24 w-full">
              <div className="w-20 h-20">
                <BudgetDoughnutChart
                  budgetItems={budgetItems}
                  allocatedAmount={selectedCategory.allocatedAmount}
                />
              </div>
            </div>
          </BudgetMetricsCard>
        )}
        
        {/* Overall Budget Progress Bar */}
        <BudgetMetricsCard title="Overall Budget">
          <BudgetProgressBar
            totalSpent={totalSpent}
            maxBudget={maxBudget || 0}
          />
        </BudgetMetricsCard>

        {/* Combined Remaining/Max Budget Card */}
        {maxBudget && (
          <RemainingBudgetCard
            remaining={remaining}
            maxBudget={maxBudget}
            onEdit={handleMaxBudgetEdit}
          />
        )}
      </div>

      {/* Budget Status - Only show helper text when no category selected */}
      {!selectedCategory && (
        <div className="text-sm text-[#AB9C95] px-4 pb-4">
          • Select a category to manage specific budget items
        </div>
      )}
    </div>
  );
});

BudgetMetrics.displayName = 'BudgetMetrics';

export default BudgetMetrics; 