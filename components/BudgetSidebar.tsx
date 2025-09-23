import React, { useState, useRef, useEffect } from 'react';
import { BudgetCategory } from '@/types/budget';
import BudgetCategoryList from './budget/BudgetCategoryList';
import { BudgetDoughnutChart } from './budget';
import { Edit, MoreHorizontal, Trash2, Sparkles, Check, X } from 'lucide-react';
import InfoTooltip from './budget/InfoTooltip';
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
  projectedSpend?: number;
  budgetFlexibility?: number;
  onSelectBudgetOverview: () => void;
  isBudgetOverviewSelected: boolean;
  mobileViewMode?: 'categories' | 'category';
  onMobileBackToCategories?: () => void;
  onRemoveAllCategories?: () => void;
  onCreateBudgetWithAI?: () => void;
  onUpdateMaxBudget?: (newAmount: number) => void;
}

const BudgetSidebar: React.FC<BudgetSidebarProps> = React.memo(({
  budgetCategories,
  selectedCategory,
  setSelectedCategory,
  onAddCategory,
  budgetItems,
  totalSpent = 0,
  totalBudget = 0,
  maxBudget = 0,
  projectedSpend = 0,
  budgetFlexibility = 0,
  onSelectBudgetOverview,
  isBudgetOverviewSelected,
  mobileViewMode = 'categories',
  onMobileBackToCategories,
  onRemoveAllCategories,
  onCreateBudgetWithAI,
  onUpdateMaxBudget,
}) => {
  const router = useRouter();
  
  
  // Mobile confirmation modal state
  const [showRemoveAllModal, setShowRemoveAllModal] = useState(false);
  
  // Inline editing state for mobile max budget
  const [isEditingMaxBudget, setIsEditingMaxBudget] = useState(false);
  const [editMaxBudgetValue, setEditMaxBudgetValue] = useState(maxBudget.toString());
  const mobileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Inline editing functions for mobile max budget
  const handleEditMaxBudget = () => {
    setIsEditingMaxBudget(true);
    setEditMaxBudgetValue(maxBudget.toString());
  };

  const handleSaveMaxBudget = () => {
    const newAmount = parseFloat(editMaxBudgetValue);
    if (!isNaN(newAmount) && newAmount >= 0 && onUpdateMaxBudget) {
      onUpdateMaxBudget(newAmount);
    }
    setIsEditingMaxBudget(false);
  };

  const handleCancelMaxBudget = () => {
    setIsEditingMaxBudget(false);
    setEditMaxBudgetValue(maxBudget.toString());
  };

  const handleMaxBudgetKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveMaxBudget();
    } else if (e.key === 'Escape') {
      handleCancelMaxBudget();
    }
  };

  // Handle click away to save for mobile max budget
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditingMaxBudget && mobileInputRef.current && !mobileInputRef.current.contains(event.target as Node)) {
        handleSaveMaxBudget();
      }
    };

    if (isEditingMaxBudget) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingMaxBudget, editMaxBudgetValue]);


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
          
          {/* Desktop: Enhanced Budget Overview */}
          <h6 className="hidden lg:block text-sm font-medium text-[#332B42] mb-2">Budget Overview</h6>
          
          {/* Enhanced Budget Overview - Clickable on desktop only */}
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
              {/* Main Metric - Max Budget */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#6B7280]">Max Budget</span>
                <span className="text-base font-semibold text-[#332B42] group-hover:text-[#A85C36] transition-colors">{formatCurrency(maxBudget)}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-[#E0DBD7] rounded-full h-2 mb-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300 bg-[#A85C36]"
                  style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                />
              </div>
              
              {/* Status Row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#6B7280]">{budgetUtilization.toFixed(1)}% used</span>
                <span className="text-xs text-[#6B7280]">{formatCurrency(totalSpent)} spent</span>
              </div>
              
              {/* Divider Line */}
              <div className="border-t border-[#E0DBD7] mb-2"></div>
              
              {/* Sub-metrics Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center">
                  <div className="text-xs text-[#6B7280]">Projected</div>
                  <div className="text-sm font-medium text-[#332B42]">{formatCurrency(projectedSpend)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#6B7280]">Flexibility</div>
                  <div className={`text-sm font-medium ${budgetFlexibility >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {budgetFlexibility < 0 ? formatCurrency(budgetFlexibility) : formatCurrency(Math.abs(budgetFlexibility))}
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Mobile: Always Visible Budget Overview Card */}
          <div className="lg:hidden space-y-3 mt-3">
            {/* Mobile: Enhanced Budget Overview Card */}
            <div className="w-full p-3 rounded-[5px] border bg-[#F8F6F4] border-[#E0DBD7]">
              {/* Main Metric - Max Budget */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#6B7280]">Max Budget</span>
                {isEditingMaxBudget ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#6B7280]">$</span>
                    <input
                      ref={mobileInputRef}
                      type="number"
                      value={editMaxBudgetValue}
                      onChange={(e) => setEditMaxBudgetValue(e.target.value)}
                      onKeyDown={handleMaxBudgetKeyPress}
                      className="w-16 text-center text-xs text-[#332B42] bg-white border border-[#A85C36] rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-[#A85C36]"
                      autoFocus
                      min="0"
                      step="100"
                    />
                    <button
                      onClick={handleSaveMaxBudget}
                      className="text-green-600 hover:text-green-700 p-1"
                      title="Save changes"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleCancelMaxBudget}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Cancel editing"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-[#332B42]">{formatCurrency(maxBudget)}</span>
                    {onUpdateMaxBudget && (
                      <button
                        onClick={handleEditMaxBudget}
                        className="text-[#A85C36] hover:text-[#8B4513] transition-colors p-1"
                        title="Edit max budget"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-[#E0DBD7] rounded-full h-2 mb-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300 bg-[#A85C36]"
                  style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                />
              </div>
              
              {/* Status Row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#6B7280]">{budgetUtilization.toFixed(1)}% used</span>
                <span className="text-xs text-[#6B7280]">{formatCurrency(totalSpent)} spent</span>
              </div>
              
              {/* Divider Line */}
              <div className="border-t border-[#E0DBD7] mb-2"></div>
              
              {/* Sub-metrics Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center">
                  <div className="text-xs text-[#6B7280] flex items-center justify-center gap-1">
                    Projected
                    <InfoTooltip 
                      content="Sum of all projected amounts across all budget categories"
                      maxWidth="max-w-48"
                    />
                  </div>
                  <div className="text-xs font-medium text-[#332B42]">{formatCurrency(projectedSpend)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#6B7280] flex items-center justify-center gap-1">
                    Flexibility
                    <InfoTooltip 
                      content={budgetFlexibility >= 0 
                        ? 'Max Budget minus Projected Spend (available to allocate)'
                        : 'Projected Spend exceeds Max Budget (over planned)'
                      }
                      maxWidth="max-w-48"
                    />
                  </div>
                  <div className={`text-xs font-medium ${budgetFlexibility >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {budgetFlexibility < 0 ? formatCurrency(budgetFlexibility) : formatCurrency(Math.abs(budgetFlexibility))}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
});

BudgetSidebar.displayName = 'BudgetSidebar';

export default BudgetSidebar; 