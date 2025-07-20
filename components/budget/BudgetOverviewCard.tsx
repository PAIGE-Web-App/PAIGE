import React from 'react';

interface BudgetOverviewCardProps {
  totalBudget: number;
  totalSpent: number;
}

const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({ totalBudget, totalSpent }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="mb-6 p-3 bg-[#F8F6F4] border border-[#AB9C95] rounded-[5px]">
      <div className="text-xs text-[#AB9C95] uppercase tracking-wider font-semibold mb-2">
        Budget Overview
      </div>
      <div className="space-y-1 text-sm text-[#332B42]">
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
  );
};

export default BudgetOverviewCard; 