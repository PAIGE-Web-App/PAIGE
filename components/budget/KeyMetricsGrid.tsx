import React from 'react';

interface KeyMetricsGridProps {
  maxBudget: number;
  totalSpent: number;
  totalRemaining: number;
  budgetUtilization: number;
  isOverBudget: boolean;
  formatCurrency: (amount: number) => string;
}

const KeyMetricsGrid: React.FC<KeyMetricsGridProps> = React.memo(({
  maxBudget,
  totalSpent,
  totalRemaining,
  budgetUtilization,
  isOverBudget,
  formatCurrency
}) => (
  <div className="grid gap-4 grid-cols-2">
    <div className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center">
      <div className="text-lg font-medium text-[#332B42]">{formatCurrency(maxBudget)}</div>
      <div className="text-sm text-[#6B7280]">Total Budget</div>
    </div>
    <div className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center">
      <div className={`text-lg font-medium ${isOverBudget ? 'text-red-600' : 'text-[#332B42]'}`}>
        {formatCurrency(totalSpent)}
      </div>
      <div className="text-sm text-[#6B7280]">Total Spent</div>
    </div>
    <div className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center">
      <div className={`text-lg font-medium ${totalRemaining < 0 ? 'text-red-600' : 'text-[#16A34A]'}`}>
        {formatCurrency(Math.abs(totalRemaining))}
      </div>
      <div className="text-sm text-[#6B7280]">
        {totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}
      </div>
    </div>
    <div className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center">
      <div className={`text-lg font-medium ${budgetUtilization > 100 ? 'text-red-600' : 'text-[#332B42]'}`}>
        {budgetUtilization.toFixed(1)}%
      </div>
      <div className="text-sm text-[#6B7280]">Utilized</div>
    </div>
  </div>
));

KeyMetricsGrid.displayName = 'KeyMetricsGrid';

export default KeyMetricsGrid;
