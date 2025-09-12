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

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white lg:border-b lg:border-[#AB9C95]">
      {/* Desktop: Full metrics */}
      <div className={`hidden lg:grid gap-3 ${gridClasses} p-4`}>
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

      {/* Mobile: Compact metrics */}
      <div className="lg:hidden p-4 space-y-3">
        {/* Category Budget Card - Match Sidebar List Item Style */}
        {selectedCategory && (
          <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-3 w-full relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-normal text-[#332B42] font-work">
                {selectedCategory.name} Budget
              </span>
              <button
                onClick={handleCategoryEdit}
                className="text-[#A85C36] hover:text-[#8B4513] transition-colors p-1"
                title="Edit category"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#AB9C95]">
                {formatCurrency(selectedCategory.spentAmount || 0)} / {formatCurrency(selectedCategory.allocatedAmount)}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-[#E0DBD7] rounded-full h-1 mb-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  (selectedCategory.spentAmount || 0) > selectedCategory.allocatedAmount ? 'bg-red-500' : 'bg-[#A85C36]'
                }`}
                style={{ width: `${Math.min(((selectedCategory.spentAmount || 0) / selectedCategory.allocatedAmount) * 100, 100)}%` }}
              />
            </div>
            
            <div className="text-xs text-[#AB9C95]">
              {(((selectedCategory.spentAmount || 0) / selectedCategory.allocatedAmount) * 100).toFixed(1)}% used
            </div>
          </div>
        )}

        {/* Budget Breakdown Doughnut Chart - Mobile Compact */}
        {selectedCategory && budgetItems.length > 0 && (
          <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-3">
            <div className="text-xs font-normal text-[#332B42] mb-3 font-work">Budget Breakdown</div>
            <div className="flex items-center justify-center pt-2 pb-6">
              <div className="w-16 h-16">
                <BudgetDoughnutChart
                  budgetItems={budgetItems}
                  allocatedAmount={selectedCategory.allocatedAmount}
                />
              </div>
            </div>
          </div>
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