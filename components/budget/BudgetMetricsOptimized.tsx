import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BudgetMetricsCard,
  BudgetDoughnutChart,
  BudgetProgressBar,
  CategoryBudgetCard,
  RemainingBudgetCard
} from './index';

interface BudgetMetricsProps {
  selectedCategory: any;
  totalBudget: number | null;
  totalSpent: number;
  maxBudget: number | null;
  budgetItems?: any[];
  onEditCategory?: (category: any) => void;
}

const BudgetMetrics: React.FC<BudgetMetricsProps> = React.memo(({
  selectedCategory,
  totalBudget,
  totalSpent,
  maxBudget,
  budgetItems = [],
  onEditCategory,
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
  
  const categorySpent = useMemo(() => 
    selectedCategory?.spentAmount || 0, 
    [selectedCategory?.spentAmount]
  );
  
  const categoryRemaining = useMemo(() => 
    selectedCategory?.allocatedAmount - categorySpent, 
    [selectedCategory?.allocatedAmount, categorySpent]
  );
  
  // Memoized callbacks
  const handleCategoryEdit = useCallback(() => {
    onEditCategory?.(selectedCategory);
  }, [onEditCategory, selectedCategory]);
  
  const handleMaxBudgetEdit = useCallback(() => {
    router.push('/settings?tab=wedding&highlight=maxBudget');
  }, [router]);
  
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
      {/* Budget Overview Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-4">
        {/* Category Budget Card */}
        {selectedCategory && (
          <CategoryBudgetCard
            categoryName={selectedCategory.name}
            allocatedAmount={selectedCategory.allocatedAmount}
            totalSpent={categorySpent}
            remaining={categoryRemaining}
            onEdit={handleCategoryEdit}
          />
        )}
        
        {/* Budget Breakdown Doughnut Chart */}
        {selectedCategory && budgetItems.length > 0 && (
          <BudgetMetricsCard title="Budget Breakdown">
            <div className="flex items-center justify-center h-24">
              <BudgetDoughnutChart
                budgetItems={budgetItems}
                allocatedAmount={selectedCategory.allocatedAmount}
              />
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
