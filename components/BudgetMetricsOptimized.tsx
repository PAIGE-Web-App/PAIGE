import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface BudgetMetricsProps {
  selectedCategory: any;
  totalBudget: number | null;
  totalSpent: number;
  budgetRange: { min: number; max: number } | null;
  onEditCategory?: (category: any) => void;
}

// Memoized currency formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Memoized budget status calculator
const useBudgetStatus = (budgetRange: { min: number; max: number } | null, totalSpent: number, totalBudget: number | null) => {
  return useMemo(() => {
    if (!budgetRange || !totalBudget) return { message: '', color: 'text-gray-600' };
    
    const average = (budgetRange.min + budgetRange.max) / 2;
    const percentage = (totalSpent / average) * 100;
    
    if (percentage > 100) {
      return { 
        message: `You're ${formatCurrency(totalSpent - average)} over your average budget.`, 
        color: 'text-red-600' 
      };
    } else if (percentage > 80) {
      return { 
        message: `You're on track within your budget range.`, 
        color: 'text-yellow-600' 
      };
    } else {
      return { 
        message: `You're ${formatCurrency(average - totalSpent)} under your average budget.`, 
        color: 'text-green-600' 
      };
    }
  }, [budgetRange, totalSpent, totalBudget]);
};

// Memoized category budget component
const CategoryBudgetCard = React.memo<{
  selectedCategory: any;
  onEditCategory?: (category: any) => void;
  animatingValues: { categoryAllocated: boolean };
}>(({ selectedCategory, onEditCategory, animatingValues }) => {
  const handleEditClick = useCallback(() => {
    if (onEditCategory) {
      onEditCategory(selectedCategory);
    }
  }, [onEditCategory, selectedCategory]);

  if (!selectedCategory) return null;

  return (
    <>
      <div className="w-80">
        <h3 className="text-sm font-medium text-[#AB9C95] mb-3">Category Budget</h3>
        
        <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-[#AB9C95]">
              {selectedCategory.name}
            </h3>
            {onEditCategory && (
              <button 
                onClick={handleEditClick}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors"
                title="Edit category"
              >
                <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
                  ✏️
                </span>
              </button>
            )}
          </div>
          <div className="text-lg font-bold text-[#332B42] mb-1">
            <span className={animatingValues.categoryAllocated ? 'animate-value-update' : ''}>
              {formatCurrency(selectedCategory.allocatedAmount)}
            </span>
          </div>
          <div className="text-sm text-[#AB9C95]">
            Budget allocated to this category
          </div>
          <div className="text-xs text-[#AB9C95] mt-1">
            {formatCurrency(selectedCategory.spentAmount || 0)} spent • {formatCurrency(selectedCategory.allocatedAmount - (selectedCategory.spentAmount || 0))} remaining
          </div>
        </div>
      </div>
      
      <div className="w-px bg-[#E0DBD7] mx-2"></div>
    </>
  );
});

CategoryBudgetCard.displayName = 'CategoryBudgetCard';

// Memoized budget range card
const BudgetRangeCard = React.memo<{
  budgetRange: { min: number; max: number } | null;
  animatingValues: { budgetRange: boolean };
}>(({ budgetRange, animatingValues }) => {
  const router = useRouter();
  
  const handleEditClick = useCallback(() => {
    router.push('/settings?tab=wedding&highlight=budgetRange');
  }, [router]);

  if (!budgetRange) return null;

  return (
    <div className="border border-[#E0DBD7] rounded-[5px] p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-[#AB9C95]">Budget Range</h3>
        <button 
          onClick={handleEditClick}
          className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors"
          title="Update in settings"
        >
          <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
            ✏️
          </span>
        </button>
      </div>
      <div className="text-lg font-bold text-[#332B42] mb-1">
        <span className={animatingValues.budgetRange ? 'animate-value-update' : ''}>
          {formatCurrency(budgetRange.min)} - {formatCurrency(budgetRange.max)}
        </span>
      </div>
      <div className="text-sm text-[#AB9C95]">
        Avg: {formatCurrency((budgetRange.min + budgetRange.max) / 2)}
      </div>
    </div>
  );
});

BudgetRangeCard.displayName = 'BudgetRangeCard';

// Memoized spent card
const SpentCard = React.memo<{
  totalSpent: number;
  budgetRange: { min: number; max: number } | null;
}>(({ totalSpent, budgetRange }) => {
  const percentageOfAverage = useMemo(() => {
    if (!budgetRange) return 0;
    const average = (budgetRange.min + budgetRange.max) / 2;
    return ((totalSpent / average) * 100).toFixed(1);
  }, [totalSpent, budgetRange]);

  return (
    <div className="border border-[#E0DBD7] rounded-[5px] p-4">
      <h3 className="text-sm font-medium text-[#AB9C95] mb-2">Total Spent</h3>
      <div className="text-lg font-bold text-[#332B42] mb-1">
        {formatCurrency(totalSpent)}
      </div>
      {budgetRange && (
        <div className="text-sm text-[#AB9C95]">
          {percentageOfAverage}% of average
        </div>
      )}
    </div>
  );
});

SpentCard.displayName = 'SpentCard';

// Memoized remaining card
const RemainingCard = React.memo<{
  remaining: number;
  animatingValues: { totalBudget: boolean };
}>(({ remaining, animatingValues }) => {
  return (
    <div className="border border-[#E0DBD7] rounded-[5px] p-4">
      <h3 className="text-sm font-medium text-[#AB9C95] mb-2">Remaining Budget</h3>
      <div className="text-lg font-bold text-[#332B42] mb-1">
        <span className={animatingValues.totalBudget ? 'animate-value-update' : ''}>
          {formatCurrency(remaining)}
        </span>
      </div>
      <div className="budget-status-text text-green-600">
        On track
      </div>
    </div>
  );
});

RemainingCard.displayName = 'RemainingCard';

// Memoized progress card
const ProgressCard = React.memo<{
  totalSpent: number;
  totalBudget: number | null;
  budgetStatus: { message: string; color: string };
}>(({ totalSpent, totalBudget, budgetStatus }) => {
  const progressPercentage = useMemo(() => {
    if (!totalBudget) return 0;
    return Math.min((totalSpent / totalBudget) * 100, 100);
  }, [totalSpent, totalBudget]);

  return (
    <div className="border border-[#E0DBD7] rounded-[5px] p-4">
      <h3 className="text-sm font-medium text-[#AB9C95] mb-2">Budget Progress</h3>
      <div className="w-full bg-[#F3F2F0] rounded-full h-2 mb-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <div className="text-sm text-[#AB9C95] mb-2">
        {progressPercentage.toFixed(1)}% used
      </div>
      <div className={`budget-status-text ${budgetStatus.color}`}>
        {budgetStatus.message}
      </div>
    </div>
  );
});

ProgressCard.displayName = 'ProgressCard';

const BudgetMetricsOptimized: React.FC<BudgetMetricsProps> = ({
  selectedCategory,
  totalBudget,
  totalSpent,
  budgetRange,
  onEditCategory,
}) => {
  // Animation state for value updates
  const [animatingValues, setAnimatingValues] = useState<{
    categoryAllocated: boolean;
    totalBudget: boolean;
    budgetRange: boolean;
  }>({
    categoryAllocated: false,
    totalBudget: false,
    budgetRange: false,
  });
  
  // Refs to track previous values
  const prevValues = useRef({
    categoryAllocated: selectedCategory?.allocatedAmount || 0,
    totalBudget: totalBudget || 0,
    budgetRange: budgetRange ? { min: budgetRange.min, max: budgetRange.max } : null,
  });
  
  // Memoized budget status
  const budgetStatus = useBudgetStatus(budgetRange, totalSpent, totalBudget);
  
  // Memoized remaining amount
  const remaining = useMemo(() => {
    return (totalBudget || 0) - totalSpent;
  }, [totalBudget, totalSpent]);

  // Check for value changes and trigger animations
  useEffect(() => {
    const currentCategoryAllocated = selectedCategory?.allocatedAmount || 0;
    const currentTotalBudget = totalBudget || 0;
    const currentBudgetRange = budgetRange ? { min: budgetRange.min, max: budgetRange.max } : null;
    
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
    
    // Check if budget range changed
    if (currentBudgetRange && prevValues.current.budgetRange) {
      if (currentBudgetRange.min !== prevValues.current.budgetRange.min || 
          currentBudgetRange.max !== prevValues.current.budgetRange.max) {
        setAnimatingValues(prev => ({ ...prev, budgetRange: true }));
        setTimeout(() => setAnimatingValues(prev => ({ ...prev, budgetRange: false })), 600);
        prevValues.current.budgetRange = currentBudgetRange;
      }
    }
  }, [selectedCategory?.allocatedAmount, totalBudget, budgetRange]);

  return (
    <div className="bg-white border-b border-[#AB9C95] p-4">
      {/* Budget Overview Cards */}
      <div className="flex gap-2 mb-3">
        {/* Category Budget Section - Only show when category is selected */}
        {selectedCategory && (
          <CategoryBudgetCard
            selectedCategory={selectedCategory}
            onEditCategory={onEditCategory}
            animatingValues={animatingValues}
          />
        )}
        
        {/* Global Metrics Section */}
        <div className="flex-1">
          {/* Global Metrics Title */}
          <h3 className="text-sm font-medium text-[#AB9C95] mb-3">
            {selectedCategory ? 'Total Budget' : 'Budget Overview'}
          </h3>
          
          <div className={`grid gap-2 ${selectedCategory ? 'grid-cols-4' : 'grid-cols-4'}`}>
            <BudgetRangeCard budgetRange={budgetRange} animatingValues={animatingValues} />
            <SpentCard totalSpent={totalSpent} budgetRange={budgetRange} />
            <RemainingCard remaining={remaining} animatingValues={animatingValues} />
            <ProgressCard totalSpent={totalSpent} totalBudget={totalBudget} budgetStatus={budgetStatus} />
          </div>
        </div>
      </div>

      {/* Budget Status - Only show helper text when no category selected */}
      {!selectedCategory && (
        <div className="text-sm text-[#AB9C95] mt-3">
          • Select a category to manage specific budget items
        </div>
      )}
    </div>
  );
};

export default React.memo(BudgetMetricsOptimized); 