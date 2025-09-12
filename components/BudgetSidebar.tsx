import React from 'react';
import { BudgetCategory } from '@/types/budget';
import BudgetCategoryList from './budget/BudgetCategoryList';

interface BudgetSidebarProps {
  budgetCategories: BudgetCategory[];
  selectedCategory: BudgetCategory | null;
  setSelectedCategory: (category: BudgetCategory | null) => void;
  onAddCategory: () => void;
  budgetItems: any[]; // Using any for now, should be BudgetItem[]
  totalSpent?: number;
  totalBudget?: number;
  maxBudget?: number;
  onSelectBudgetOverview: () => void;
  isBudgetOverviewSelected: boolean;
  mobileViewMode?: 'categories' | 'category';
  onMobileBackToCategories?: () => void;
}

const BudgetSidebar: React.FC<BudgetSidebarProps> = ({
  budgetCategories,
  selectedCategory,
  setSelectedCategory,
  onAddCategory,
  budgetItems,
  totalSpent = 0,
  totalBudget = 0,
  maxBudget = 0,
  onSelectBudgetOverview,
  isBudgetOverviewSelected,
  mobileViewMode = 'categories',
  onMobileBackToCategories,
}) => {
  // Calculate budget statistics
  const totalRemaining = maxBudget - totalSpent;
  const budgetUtilization = maxBudget > 0 ? (totalSpent / maxBudget) * 100 : 0;

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
    <aside className={`unified-sidebar flex flex-col ${mobileViewMode ? `mobile-${mobileViewMode}-view` : ''}`}>
      {/* Fixed Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[#AB9C95] bg-[#F3F2F0] flex-shrink-0">
        <h6 className="flex items-center">
          <span className="hidden lg:inline">Budget Categories</span>
          <span className="lg:hidden">Budget</span>
        </h6>
        <button
          onClick={onAddCategory}
          className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] ml-auto"
          title="Add a new category"
        >
          + New Category
        </button>
      </div>
      
      {/* Overall Wedding Budget Overview */}
      <div className="p-4 border-b border-[#E0DBD7] bg-white flex-shrink-0">
        <div className="mb-3">
          <h6 className="text-sm font-medium text-[#332B42] mb-2">Overall Wedding Budget</h6>
          
          {/* Total Budget from Settings */}
          <button
            onClick={onSelectBudgetOverview}
            className={`w-full p-3 rounded-[5px] border transition-all duration-200 cursor-pointer group ${
              isBudgetOverviewSelected 
                ? 'bg-[#EBE3DD] border-[#A85C36]' 
                : 'bg-[#F8F6F4] border-[#E0DBD7] hover:bg-[#F0EDE8] hover:border-[#A85C36]'
            }`}
            title="Click to view budget overview"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#6B7280]">Total Budget</span>
              <span className="text-sm font-semibold text-[#332B42] group-hover:text-[#A85C36] transition-colors">{formatCurrency(maxBudget)}</span>
            </div>
            <div className="w-full bg-[#E0DBD7] rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300 bg-[#A85C36]"
                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-[#6B7280]">{budgetUtilization.toFixed(1)}% used</span>
              <span className="text-xs text-[#6B7280]">{formatCurrency(totalSpent)} spent</span>
            </div>
            <div className="text-center mt-2 pt-2 border-t border-[#E0DBD7]">
              <span className="text-xs text-[#6B7280] group-hover:text-[#A85C36] transition-colors">
                {totalRemaining >= 0 ? `${formatCurrency(totalRemaining)} remaining` : `${formatCurrency(Math.abs(totalRemaining))} over budget`}
              </span>
            </div>
          </button>
        </div>
      </div>
      
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