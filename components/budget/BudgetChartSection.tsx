import React from 'react';
import { BudgetDoughnutChart } from './BudgetDoughnutChart';

interface BudgetChartSectionProps {
  chartData: Array<{
    id: string;
    name: string;
    amount: number;
    color: string;
  }>;
  maxBudget: number;
}

const BudgetChartSection: React.FC<BudgetChartSectionProps> = React.memo(({ chartData, maxBudget }) => {
  if (chartData.length > 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <BudgetDoughnutChart
          budgetItems={chartData}
          allocatedAmount={maxBudget}
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <img 
        src="/Wedding%20Illustration.png" 
        alt="Wedding Illustration" 
        className="w-32 h-32 mx-auto mb-4 opacity-60"
      />
      <p className="text-[#6B7280] mb-2">You haven't added any items to any budget categories yet!</p>
      <p className="text-sm text-[#6B7280]">Add budget items to see spending breakdown by category.</p>
    </div>
  );
});

BudgetChartSection.displayName = 'BudgetChartSection';

export default BudgetChartSection;
