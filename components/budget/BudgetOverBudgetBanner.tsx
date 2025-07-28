import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface BudgetOverBudgetBannerProps {
  categoryName: string;
  spentAmount: number;
  allocatedAmount: number;
}

const BudgetOverBudgetBanner: React.FC<BudgetOverBudgetBannerProps> = ({
  categoryName,
  spentAmount,
  allocatedAmount,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const overBudgetAmount = spentAmount - allocatedAmount;
  const overBudgetPercentage = ((spentAmount / allocatedAmount) * 100 - 100).toFixed(1);

  return (
    <div className="bg-red-50 border border-red-200 rounded-[5px] p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-800 mb-1">
            Over Budget Alert
          </h4>
          <p className="text-sm text-red-700">
            <strong>{categoryName}</strong> is over budget by{' '}
            <strong>{formatCurrency(overBudgetAmount)}</strong> ({overBudgetPercentage}% over allocated amount).
          </p>
          <p className="text-xs text-red-600 mt-1">
            Consider reviewing your expenses or adjusting your budget allocation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BudgetOverBudgetBanner; 