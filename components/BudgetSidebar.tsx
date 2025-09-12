import React, { useState } from 'react';
import { BudgetCategory } from '@/types/budget';
import BudgetCategoryList from './budget/BudgetCategoryList';
import { BudgetDoughnutChart } from './budget';
import { ChevronDown, ChevronUp, Edit, MoreHorizontal, Trash2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmationModal from '@/components/ConfirmationModal';

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
  onRemoveAllCategories?: () => void;
  onCreateBudgetWithAI?: () => void;
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
  onRemoveAllCategories,
  onCreateBudgetWithAI,
}) => {
  const router = useRouter();
  
  // Mobile collapsible state for Total Budget section
  const [isTotalBudgetExpanded, setIsTotalBudgetExpanded] = useState(true);
  
  // Mobile confirmation modal state
  const [showRemoveAllModal, setShowRemoveAllModal] = useState(false);
  
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

  // Handle remove all categories with confirmation
  const handleRemoveAllCategories = () => {
    setShowRemoveAllModal(true);
  };

  const handleConfirmRemoveAll = () => {
    onRemoveAllCategories?.();
    setShowRemoveAllModal(false);
  };


  return (
    <aside className={`unified-sidebar flex flex-col ${mobileViewMode ? `mobile-${mobileViewMode}-view` : ''}`}>
      {/* Fixed Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[#AB9C95] bg-[#F3F2F0] flex-shrink-0">
        <h6 className="flex items-center">
          Budget
        </h6>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onAddCategory}
            className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0]"
            title="Add a new category"
          >
            + New Category
          </button>
          
          {/* Mobile Three-Dot Menu */}
          <div className="lg:hidden">
            <DropdownMenu
              trigger={
                <button className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-[#AB9C95]" />
                </button>
              }
              items={[
                {
                  label: 'Remove All Categories',
                  icon: <Trash2 className="w-4 h-4" />,
                  onClick: handleRemoveAllCategories,
                  show: onRemoveAllCategories,
                  className: 'text-red-600 hover:text-red-700',
                },
                {
                  label: 'Create Budget with Paige (5 Credits)',
                  icon: <Sparkles className="w-4 h-4" />,
                  onClick: () => onCreateBudgetWithAI?.(),
                  show: onCreateBudgetWithAI,
                },
              ].filter(item => item.show)}
              width={280}
              align="right"
            />
          </div>
        </div>
      </div>
      
        {/* Overall Wedding Budget Overview */}
        <div className="p-4 border-b border-[#E0DBD7] bg-white flex-shrink-0">
          <div>
            {/* Mobile: Collapsible Total Budget Header */}
            <div className="lg:hidden">
            <button
              onClick={() => setIsTotalBudgetExpanded(!isTotalBudgetExpanded)}
              className="w-full flex items-center justify-between p-2 hover:bg-[#F8F6F4] rounded-[5px] transition-colors"
            >
              <h6 className="text-sm font-medium text-[#332B42]">Total Budget</h6>
              <div className="flex items-center gap-2">
                {/* Only show summary when collapsed */}
                {!isTotalBudgetExpanded && (
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#332B42]">{formatCurrency(maxBudget)}</div>
                    <div className="text-xs text-[#6B7280]">{formatCurrency(totalSpent)} spent</div>
                  </div>
                )}
                {isTotalBudgetExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#6B7280]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#6B7280]" />
                )}
              </div>
            </button>
          </div>
          
          {/* Desktop: Regular Total Budget Header */}
          <h6 className="hidden lg:block text-sm font-medium text-[#332B42] mb-2">Total Budget</h6>
          
          {/* Total Budget from Settings - Clickable on desktop only */}
          <div className={`w-full p-3 rounded-[5px] border transition-all duration-200 group ${
            isBudgetOverviewSelected 
              ? 'bg-[#EBE3DD] border-[#A85C36]' 
              : 'bg-[#F8F6F4] border-[#E0DBD7] hover:bg-[#F0EDE8] hover:border-[#A85C36]'
          } hidden lg:block`}>
            <button
              onClick={onSelectBudgetOverview}
              className="w-full text-left"
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
            </button>
            <div className="flex items-center justify-center mt-2 pt-2 border-t border-[#E0DBD7] gap-2">
              <span className="text-xs text-[#6B7280] group-hover:text-[#A85C36] transition-colors">
                {totalRemaining >= 0 ? `${formatCurrency(totalRemaining)} remaining` : `${formatCurrency(Math.abs(totalRemaining))} over budget`}
              </span>
              <button
                onClick={() => router.push('/settings?tab=wedding&highlight=maxBudget')}
                className="text-[#A85C36] hover:text-[#8B4513] transition-colors p-1"
                title="Edit budget in settings"
              >
                <Edit className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Mobile: Collapsible Total Budget Content */}
          {isTotalBudgetExpanded && (
            <div className="lg:hidden space-y-3 mt-3">
              {/* Mobile: Non-clickable Total Budget Card */}
              <div className="w-full p-3 rounded-[5px] border bg-[#F8F6F4] border-[#E0DBD7]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#6B7280]">Total Budget</span>
                  <span className="text-sm font-semibold text-[#332B42]">{formatCurrency(maxBudget)}</span>
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
                <div className="flex items-center justify-center mt-2 pt-2 border-t border-[#E0DBD7] gap-2">
                  <span className="text-xs text-[#6B7280]">
                    {totalRemaining >= 0 ? `${formatCurrency(totalRemaining)} remaining` : `${formatCurrency(Math.abs(totalRemaining))} over budget`}
                  </span>
                  <button
                    onClick={() => router.push('/settings?tab=wedding&highlight=maxBudget')}
                    className="text-[#A85C36] hover:text-[#8B4513] transition-colors p-1"
                    title="Edit budget in settings"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Mobile: Budget Spend by Category Doughnut Chart */}
              {budgetCategories.length > 0 && (
                <div className="w-full p-3 rounded-[5px] border bg-[#F8F6F4] border-[#E0DBD7]">
                  <div className="text-xs font-normal text-[#332B42] mb-3 font-work">Budget Spend by Category</div>
                  <div className="flex items-center justify-center pt-2 pb-6">
                    <div className="w-16 h-16">
                      <BudgetDoughnutChart
                        budgetItems={budgetCategories.map(cat => {
                          // Calculate spent amount from budget items for this category
                          const categorySpent = budgetItems
                            .filter(item => item.categoryId === cat.id)
                            .reduce((sum, item) => sum + (item.amount || 0), 0);
                          
                          return {
                            id: cat.id || '',
                            name: cat.name,
                            amount: categorySpent
                          };
                        })}
                        allocatedAmount={maxBudget}
                        className=""
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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

      {/* Mobile Remove All Categories Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveAllModal}
        onClose={() => setShowRemoveAllModal(false)}
        onConfirm={handleConfirmRemoveAll}
        title="Remove All Categories"
        message="Are you sure you want to remove all budget categories? This will clear all categories and their associated budget items."
        warningMessage="This action cannot be undone. All budget data will be permanently deleted."
        confirmButtonText="Remove All"
        confirmButtonVariant="danger"
      />

    </aside>
  );
};

export default BudgetSidebar; 