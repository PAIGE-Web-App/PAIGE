import React from 'react';
import { Sparkles, Upload } from 'lucide-react';

interface BudgetSummaryProps {
  totalBudget: number | null;
  totalSpent: number;
  budgetRange: { min: number; max: number } | null;
  onShowAIAssistant: () => void;
  onShowCSVUpload: () => void;
}

const BudgetSummary: React.FC<BudgetSummaryProps> = ({
  totalBudget,
  totalSpent,
  budgetRange,
  onShowAIAssistant,
  onShowCSVUpload,
}) => {
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

  return (
    <div className="bg-white border-b border-[#AB9C95] p-4">
      {/* Header with title and action buttons */}
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-lg font-semibold text-[#332B42]">Wedding Budget</h5>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowAIAssistant}
            className="btn-gradient-purple flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </button>
          <button
            onClick={onShowCSVUpload}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            IMPORT CSV
          </button>
        </div>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        {/* Budget Range Card */}
        {budgetRange && (
          <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[#AB9C95]">Budget Range</h3>
              <button 
                onClick={() => window.location.href = '/settings'}
                className="text-[#A85C36] hover:underline text-xs"
                title="Update in settings"
              >
                edit
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
        <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4">
          <h3 className="text-sm font-medium text-[#AB9C95] mb-2">Spent</h3>
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
        <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4">
          <h3 className="text-sm font-medium text-[#AB9C95] mb-2">Remaining</h3>
          <div className="text-lg font-bold text-[#332B42] mb-1">
            {formatCurrency((totalBudget || 0) - totalSpent)}
          </div>
          <div className="text-sm text-green-600 font-medium">
            On track
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="w-full bg-[#F3F2F0] rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ 
              width: `${Math.min((totalSpent / (totalBudget || 1)) * 100, 100)}%` 
            }}
          />
        </div>
      </div>

      {/* Compact Budget Status */}
      <div className="text-sm text-[#AB9C95]">
        <span className={budgetStatus.color}>
          {budgetStatus.message}
        </span>
      </div>
    </div>
  );
};

export default BudgetSummary; 