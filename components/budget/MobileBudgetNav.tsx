import React, { useState } from 'react';
import { ChevronDown, Plus, Menu } from 'lucide-react';
import { BudgetCategory } from '@/types/budget';
import BudgetOverviewCard from './BudgetOverviewCard';

interface MobileBudgetNavProps {
  budgetCategories: BudgetCategory[];
  selectedCategory: BudgetCategory | null;
  setSelectedCategory: (category: BudgetCategory | null) => void;
  onAddCategory: () => void;
  totalSpent: number;
  totalBudget: number;
  budgetItems: any[];
}

const MobileBudgetNav: React.FC<MobileBudgetNavProps> = ({
  budgetCategories,
  selectedCategory,
  setSelectedCategory,
  onAddCategory,
  totalSpent,
  totalBudget,
  budgetItems,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getCategoryItemCount = (categoryId: string) => {
    return budgetItems.filter(item => item.categoryId === categoryId).length;
  };

  const getCategoryItemCountSafe = (categoryId: string | undefined) => {
    if (!categoryId) return 0;
    return budgetItems.filter(item => item.categoryId === categoryId).length;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="lg:hidden">
      {/* Mobile Header - Always Visible */}
      <div className="bg-white border-b border-[#AB9C95] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-[#F3F2F0] rounded-[5px] transition-colors"
            >
              <Menu className="w-5 h-5 text-[#332B42]" />
            </button>
            <div>
              <h6 className="text-[#332B42] font-medium">
                {selectedCategory ? selectedCategory.name : 'All Categories'}
              </h6>
                             <p className="text-xs text-[#7A7A7A]">
                 {selectedCategory 
                   ? `${getCategoryItemCountSafe(selectedCategory.id)} items`
                   : `${budgetItems.length} total items`
                 }
               </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          >
            <ChevronDown className="w-4 h-4 text-[#332B42]" />
          </button>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="bg-[#F3F2F0] border-b border-[#AB9C95] max-h-96 overflow-y-auto">
          {/* Budget Overview */}
          <div className="p-4 border-b border-[#AB9C95]">
            <BudgetOverviewCard 
              totalBudget={totalBudget} 
              totalSpent={totalSpent} 
            />
          </div>

          {/* Categories List */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h6 className="text-[#332B42] font-medium">Categories</h6>
              <button
                onClick={onAddCategory}
                className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-white transition-colors"
              >
                <Plus className="w-3 h-3 inline mr-1" />
                Add
              </button>
            </div>

            {/* All Categories Option */}
            <button
              onClick={() => {
                setSelectedCategory(null);
                setIsExpanded(false);
              }}
              className={`w-full text-left p-3 rounded-[5px] mb-2 transition-colors ${
                !selectedCategory 
                  ? 'bg-white border border-[#A85C36]' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#332B42]">All Categories</div>
                  <div className="text-xs text-[#7A7A7A]">
                    {budgetItems.length} items • {formatCurrency(totalSpent)} spent
                  </div>
                </div>
                <div className="text-xs text-[#7A7A7A]">
                  {formatCurrency(totalBudget)}
                </div>
              </div>
            </button>

            {/* Individual Categories */}
            {budgetCategories.map((category) => {
              const categoryItems = budgetItems.filter(item => item.categoryId === category.id);
              const categorySpent = categoryItems.reduce((sum, item) => sum + (item.amount || 0), 0);
              
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsExpanded(false);
                  }}
                  className={`w-full text-left p-3 rounded-[5px] mb-2 transition-colors ${
                    selectedCategory?.id === category.id 
                      ? 'bg-white border border-[#A85C36]' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#332B42]">{category.name}</div>
                      <div className="text-xs text-[#7A7A7A]">
                        {categoryItems.length} items • {formatCurrency(categorySpent)} spent
                      </div>
                    </div>
                    <div className="text-xs text-[#7A7A7A]">
                      {formatCurrency(category.allocatedAmount)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileBudgetNav; 