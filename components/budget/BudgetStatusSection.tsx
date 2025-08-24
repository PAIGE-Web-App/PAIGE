import React from 'react';

interface BudgetStatusSectionProps {
  isOverBudget: boolean;
  budgetUtilization: number;
  overBudgetCount: number;
  underBudgetCount: number;
}

const BudgetStatusSection: React.FC<BudgetStatusSectionProps> = React.memo(({
  isOverBudget,
  budgetUtilization,
  overBudgetCount,
  underBudgetCount
}) => {
  const getStatusInfo = () => {
    if (isOverBudget) {
      return { text: 'Over Budget', className: 'bg-red-100 text-red-800' };
    } else if (budgetUtilization > 80) {
      return { text: 'Near Limit', className: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: 'On Track', className: 'bg-green-100 text-green-800' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#6B7280]">Overall Status</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
          {statusInfo.text}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#6B7280]">Categories Over Budget</span>
        <span className="text-sm font-medium text-[#332B42]">
          {overBudgetCount}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#6B7280]">Categories Under Budget</span>
        <span className="text-sm font-medium text-[#332B42]">
          {underBudgetCount}
        </span>
      </div>
    </div>
  );
});

BudgetStatusSection.displayName = 'BudgetStatusSection';

export default BudgetStatusSection;
