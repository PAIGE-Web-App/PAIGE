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
      <div className="flex items-center justify-between mb-4">
        <h5>Wedding Budget</h5>
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
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4">
          <h3 className="text-sm font-medium text-[#AB9C95] mb-1">Total Budget</h3>
          <div className="text-lg font-bold text-[#332B42]">
            {budgetRange ? `${formatCurrency(budgetRange.min)} - ${formatCurrency(budgetRange.max)}` : formatCurrency(totalBudget || 0)}
          </div>
          {budgetRange && (
            <div className="text-sm text-[#AB9C95]">
              Average: {formatCurrency((budgetRange.min + budgetRange.max) / 2)}
            </div>
          )}
        </div>

        <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4">
          <h3 className="text-sm font-medium text-[#AB9C95] mb-1">Spent</h3>
          <div className="text-lg font-bold text-[#332B42]">
            {formatCurrency(totalSpent)}
          </div>
          {budgetRange && (
            <div className="text-sm text-[#AB9C95]">
              {((totalSpent / ((budgetRange.min + budgetRange.max) / 2)) * 100).toFixed(1)}% of average budget
            </div>
          )}
        </div>

        <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4">
          <h3 className="text-sm font-medium text-[#AB9C95] mb-1">Remaining</h3>
          <div className="text-lg font-bold text-[#332B42]">
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

      {/* Budget Status */}
      <div className="text-sm">
        <span className="text-[#AB9C95]">Budget Status: </span>
        <span className={budgetStatus.color}>
          {budgetStatus.message}
        </span>
        {budgetRange && (
          <span className="text-[#AB9C95]">
            {` Range: ${formatCurrency(budgetRange.min)} - ${formatCurrency(budgetRange.max)} | Average: ${formatCurrency((budgetRange.min + budgetRange.max) / 2)} | Spent: ${formatCurrency(totalSpent)}`}
          </span>
        )}
      </div>
    </div>
  );
};

export default BudgetSummary; 