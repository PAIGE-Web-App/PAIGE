import React from 'react';
import { Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import { BudgetCategory } from '@/types/budget';

interface BudgetSidebarProps {
  budgetCategories: BudgetCategory[];
  selectedCategory: BudgetCategory | null;
  setSelectedCategory: (category: BudgetCategory | null) => void;
  onAddCategory: () => void;
  onEditCategory: (category: BudgetCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
  totalSpent: number;
  totalBudget: number;
}

const BudgetSidebar: React.FC<BudgetSidebarProps> = ({
  budgetCategories,
  selectedCategory,
  setSelectedCategory,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  totalSpent,
  totalBudget,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateCategorySpent = (category: BudgetCategory) => {
    // This would need to be calculated from budget items
    // For now, using a placeholder
    return category.spentAmount || 0;
  };

  const getCategoryProgress = (category: BudgetCategory) => {
    const spent = calculateCategorySpent(category);
    const allocated = category.allocatedAmount;
    return allocated > 0 ? (spent / allocated) * 100 : 0;
  };

  return (
    <div className="w-64 bg-[#F3F2F0] border-r border-[#AB9C95] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#AB9C95]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-[#332B42]">Budget Categories</h2>
          <button
            onClick={onAddCategory}
            className="p-1 text-[#A85C36] hover:bg-[#F8F6F4] rounded"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* Budget Summary */}
        <div className="text-sm text-[#AB9C95]">
          <div className="flex justify-between">
            <span>Total Budget:</span>
            <span className="font-medium">{formatCurrency(totalBudget)}</span>
          </div>
          <div className="flex justify-between">
            <span>Spent:</span>
            <span className="font-medium">{formatCurrency(totalSpent)}</span>
          </div>
          <div className="flex justify-between">
            <span>Remaining:</span>
            <span className="font-medium">{formatCurrency(totalBudget - totalSpent)}</span>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {budgetCategories.length === 0 ? (
            <div className="text-center py-8 text-[#AB9C95]">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No budget categories yet</p>
              <p className="text-xs">Click the + button to add one</p>
            </div>
          ) : (
            budgetCategories.map((category) => {
              const progress = getCategoryProgress(category);
              const spent = calculateCategorySpent(category);
              const isSelected = selectedCategory?.id === category.id;

              return (
                <div
                  key={category.id}
                  className={`mb-2 p-3 rounded-[5px] cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#A85C36] text-white'
                      : 'bg-white hover:bg-[#F8F6F4] text-[#332B42]'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm truncate flex-1">
                      {category.name}
                    </h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditCategory(category);
                        }}
                        className="p-1 hover:bg-black/10 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCategory(category.id!);
                        }}
                        className="p-1 hover:bg-black/10 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs mb-2">
                    <div className="flex justify-between">
                      <span>Allocated:</span>
                      <span>{formatCurrency(category.allocatedAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spent:</span>
                      <span>{formatCurrency(spent)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-black/20 rounded-full h-1.5 mb-1">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        progress > 100 ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>

                  <div className="text-xs opacity-75">
                    {progress.toFixed(1)}% used
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetSidebar; 