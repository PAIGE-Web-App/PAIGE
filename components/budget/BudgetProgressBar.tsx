import React from 'react';

interface BudgetProgressBarProps {
  totalSpent: number;
  maxBudget: number;
  className?: string;
}

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  totalSpent,
  maxBudget,
  className = ''
}) => {
  const percentage = maxBudget > 0 ? (totalSpent / maxBudget) * 100 : 0;
  const remaining = maxBudget - totalSpent;
  const isUnderBudget = remaining > 0;

  return (
    <div className={className}>
      <div className="text-lg font-bold text-[#332B42] mb-2">
        ${totalSpent.toLocaleString()} <span className="text-sm font-normal text-[#AB9C95]">Spent</span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-[#E0DBD7] rounded-full h-2 mb-2">
        <div 
          className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      {/* Percentage and Status */}
      <div className="text-xs text-[#AB9C95] mb-2">
        {percentage.toFixed(1)}% used
      </div>
      
      {/* Status Message */}
      <div className={`text-sm ${isUnderBudget ? 'text-green-600' : 'text-red-600'}`}>
        {isUnderBudget 
          ? `You're $${remaining.toLocaleString()} under your max budget.`
          : `You're $${Math.abs(remaining).toLocaleString()} over your max budget.`
        }
      </div>
    </div>
  );
};
