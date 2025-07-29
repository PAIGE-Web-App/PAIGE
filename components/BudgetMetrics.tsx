import React from 'react';
import { useRouter } from 'next/navigation';

interface BudgetMetricsProps {
  selectedCategory: any;
  totalBudget: number | null;
  totalSpent: number;
  budgetRange: { min: number; max: number } | null;
}

const BudgetMetrics: React.FC<BudgetMetricsProps> = ({
  selectedCategory,
  totalBudget,
  totalSpent,
  budgetRange,
}) => {
  const router = useRouter();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBudgetStatus = () => {
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
  };

  const budgetStatus = getBudgetStatus();
  const remaining = (totalBudget || 0) - totalSpent;

  return (
    <div className="bg-white border-b border-[#AB9C95] p-4">
            {/* Budget Overview Cards */}
      <div className="flex gap-2 mb-3">
        {/* Category Budget Section - Only show when category is selected */}
        {selectedCategory && (
          <>
            <div className="w-80">
              {/* Category Budget Title */}
              <h3 className="text-sm font-medium text-[#AB9C95] mb-3">Category Budget</h3>
              
              <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4">
                <h3 className={`text-sm font-medium mb-2 ${
                  (selectedCategory.spentAmount || 0) > selectedCategory.allocatedAmount 
                    ? 'text-red-600' 
                    : 'text-[#AB9C95]'
                }`}>
                  {selectedCategory.name}
                </h3>
                <div className="text-lg font-bold text-[#332B42] mb-1">
                  {formatCurrency(selectedCategory.spentAmount || 0)} of {formatCurrency(selectedCategory.allocatedAmount)}
                </div>
                <div className="text-sm text-[#AB9C95]">
                  {((selectedCategory.spentAmount || 0) / selectedCategory.allocatedAmount * 100).toFixed(1)}% used
                </div>
                <div className={`text-xs font-medium mt-1 ${
                  (selectedCategory.spentAmount || 0) > selectedCategory.allocatedAmount 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {formatCurrency(selectedCategory.allocatedAmount - (selectedCategory.spentAmount || 0))} remaining
                </div>
              </div>
            </div>
            
            {/* Separator */}
            <div className="w-px bg-[#E0DBD7] mx-2"></div>
          </>
        )}
        
        {/* Global Metrics Section */}
        <div className="flex-1">
          {/* Global Metrics Title */}
          <h3 className="text-sm font-medium text-[#AB9C95] mb-3">
            {selectedCategory ? 'Total Budget' : 'Budget Overview'}
          </h3>
          
          <div className={`grid gap-2 ${selectedCategory ? 'grid-cols-4' : 'grid-cols-4'}`}>
            {/* Budget Range Card */}
            {budgetRange && (
              <div className="border border-[#E0DBD7] rounded-[5px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[#AB9C95]">Budget Range</h3>
                  <button 
                    onClick={() => router.push('/settings?tab=wedding&highlight=budgetRange')}
                    className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0] flex-shrink-0 whitespace-nowrap"
                    title="Update in settings"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-lg font-bold text-[#332B42] mb-1">
                  {formatCurrency(budgetRange.min)} - {formatCurrency(budgetRange.max)}
                </div>
                <div className="text-sm text-[#AB9C95]">
                  Avg: {formatCurrency((budgetRange.min + budgetRange.max) / 2)}
                </div>
              </div>
            )}
            
            {/* Spent Card */}
            <div className="border border-[#E0DBD7] rounded-[5px] p-4">
              <h3 className="text-sm font-medium text-[#AB9C95] mb-2">
                {selectedCategory ? 'Total Spent' : 'Total Spent'}
              </h3>
              <div className="text-lg font-bold text-[#332B42] mb-1">
                {formatCurrency(totalSpent)}
              </div>
              {budgetRange && (
                <div className="text-sm text-[#AB9C95]">
                  {((totalSpent / ((budgetRange.min + budgetRange.max) / 2)) * 100).toFixed(1)}% of average
                </div>
              )}
            </div>
            
            {/* Remaining Card */}
            <div className="border border-[#E0DBD7] rounded-[5px] p-4">
              <h3 className="text-sm font-medium text-[#AB9C95] mb-2">
                {selectedCategory ? 'Remaining Budget' : 'Remaining Budget'}
              </h3>
              <div className="text-lg font-bold text-[#332B42] mb-1">
                {formatCurrency(remaining)}
              </div>
              <div className="budget-status-text text-green-600">
                On track
              </div>
            </div>

            {/* Progress Bar Card */}
            <div className="border border-[#E0DBD7] rounded-[5px] p-4">
              <h3 className="text-sm font-medium text-[#AB9C95] mb-2">Budget Progress</h3>
              <div className="w-full bg-[#F3F2F0] rounded-full h-2 mb-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min((totalSpent / (totalBudget || 1)) * 100, 100)}%` 
                  }}
                />
              </div>
              <div className="text-sm text-[#AB9C95] mb-2">
                {((totalSpent / (totalBudget || 1)) * 100).toFixed(1)}% used
              </div>
              <div className={`budget-status-text ${budgetStatus.color}`}>
                {budgetStatus.message}
              </div>
            </div>
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

export default BudgetMetrics; 