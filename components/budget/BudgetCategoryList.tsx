import React, { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { BudgetCategory } from '@/types/budget';
import BudgetCategoryItem from './BudgetCategoryItem';

interface BudgetCategoryListProps {
  budgetCategories: BudgetCategory[];
  selectedCategory: BudgetCategory | null;
  budgetItems: any[]; // Using any for now, should be BudgetItem[]
  onSelectCategory: (category: BudgetCategory) => void;
}

const BudgetCategoryList: React.FC<BudgetCategoryListProps> = ({
  budgetCategories,
  selectedCategory,
  budgetItems,
  onSelectCategory,
}) => {
  // Memoize the category spent amounts calculation
  const categorySpentAmounts = useMemo(() => {
    const spentMap = new Map<string, number>();
    
    budgetItems.forEach(item => {
      const currentSpent = spentMap.get(item.categoryId) || 0;
      spentMap.set(item.categoryId, currentSpent + item.amount);
    });
    
    return spentMap;
  }, [budgetItems]);

  if (budgetCategories.length === 0) {
    return (
      <div className="text-center py-8 text-[#AB9C95]">
        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No budget categories yet</p>
        <p className="text-xs">Click + New Category to add one</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-4">
      {budgetCategories.map((category) => (
        <BudgetCategoryItem
          key={category.id}
          category={category}
          isSelected={selectedCategory?.id === category.id}
          spentAmount={categorySpentAmounts.get(category.id!) || 0}
          onSelect={onSelectCategory}
        />
      ))}
    </div>
  );
};

export default BudgetCategoryList; 

