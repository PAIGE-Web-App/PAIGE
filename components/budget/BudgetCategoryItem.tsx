import React, { memo } from 'react';
import { BudgetCategory } from '@/types/budget';

interface BudgetCategoryItemProps {
  category: BudgetCategory;
  isSelected: boolean;
  spentAmount: number;
  onSelect: (category: BudgetCategory) => void;
}

const BudgetCategoryItem: React.FC<BudgetCategoryItemProps> = memo(({
  category,
  isSelected,
  spentAmount,
  onSelect,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryProgress = () => {
    const allocated = category.allocatedAmount;
    return allocated > 0 ? (spentAmount / allocated) * 100 : 0;
  };

  const progress = getCategoryProgress();

  return (
    <div
      onClick={() => onSelect(category)}
      className={`p-3 mb-3 rounded-[5px] border cursor-pointer transition-all duration-300 ease-in-out ${
        isSelected 
          ? 'bg-[#EBE3DD] border-[#A85C36]' 
          : 'hover:bg-[#F8F6F4] border-transparent hover:border-[#AB9C95]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="truncate">{category.name}</span>
        <span className="text-xs text-[#AB9C95]">
          {formatCurrency(spentAmount)} / {formatCurrency(category.allocatedAmount)}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-[#E0DBD7] rounded-full h-1 mb-1">
        <div
          className={`h-1 rounded-full transition-all ${
            progress > 100 ? 'bg-red-500' : 'bg-[#A85C36]'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      
      <div className="text-xs text-[#AB9C95]">
        {progress.toFixed(1)}% used
      </div>
    </div>
  );
});

BudgetCategoryItem.displayName = 'BudgetCategoryItem';

export default BudgetCategoryItem; 

