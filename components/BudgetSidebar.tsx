import React from 'react';
import { BudgetCategory } from '@/types/budget';
import BudgetCategoryList from './budget/BudgetCategoryList';

interface BudgetSidebarProps {
  budgetCategories: BudgetCategory[];
  selectedCategory: BudgetCategory | null;
  setSelectedCategory: (category: BudgetCategory | null) => void;
  onAddCategory: () => void;
  budgetItems: any[]; // Using any for now, should be BudgetItem[]
}

const BudgetSidebar: React.FC<BudgetSidebarProps> = ({
  budgetCategories,
  selectedCategory,
  setSelectedCategory,
  onAddCategory,
  budgetItems,
}) => {


  return (
    <aside className="unified-sidebar hidden lg:flex flex-col">
      {/* Fixed Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[#AB9C95] bg-[#F3F2F0] flex-shrink-0">
        <h6 className="flex items-center">
          Budget Categories
        </h6>
        <button
          onClick={onAddCategory}
          className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] ml-auto"
          title="Add a new category"
        >
          + New Category
        </button>
      </div>
      
      {/* Fixed Budget Overview - Hidden as redundant with main metrics cards */}
      {/* <div className="p-4 flex-shrink-0">
        <BudgetOverviewCard 
          totalBudget={totalBudget} 
          totalSpent={totalSpent} 
        />
      </div> */}
      
      {/* Scrollable Categories List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <BudgetCategoryList
          budgetCategories={budgetCategories}
          selectedCategory={selectedCategory}
          budgetItems={budgetItems}
          onSelectCategory={setSelectedCategory}
        />
      </div>
    </aside>
  );
};

export default BudgetSidebar; 