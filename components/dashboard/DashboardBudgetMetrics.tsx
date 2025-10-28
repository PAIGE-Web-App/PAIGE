import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DashboardBudgetMetricsProps {
  maxBudget: number;
  totalSpent: number;
  projectedSpend: number;
  isLoading?: boolean;
}

const DashboardBudgetMetrics: React.FC<DashboardBudgetMetricsProps> = ({
  maxBudget,
  totalSpent,
  projectedSpend,
  isLoading = false
}) => {
  const router = useRouter();

  // Calculate metrics
  const remaining = useMemo(() => maxBudget - totalSpent, [maxBudget, totalSpent]);
  const budgetUtilization = useMemo(() => 
    maxBudget > 0 ? (totalSpent / maxBudget) * 100 : 0, 
    [totalSpent, maxBudget]
  );
  const isOverBudget = remaining < 0;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If no budget is set, show empty state
  if (!maxBudget || maxBudget === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header - Match todo block style */}
      <div className="flex items-center justify-between p-4 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-[#332B42] font-work">Budget at a Glance</h3>
        </div>
        <button
          onClick={() => router.push('/budget')}
          className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="View budget details"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Budget */}
          <div className="bg-[#F8F6F4] p-3 rounded-lg border border-[#E0DBD7] text-center">
            <div className="text-base font-medium text-[#332B42] mb-1">
              {formatCurrency(maxBudget)}
            </div>
            <div className="text-xs text-[#6B7280] font-work">Total Budget</div>
          </div>

          {/* Total Spent */}
          <div className="bg-[#F8F6F4] p-3 rounded-lg border border-[#E0DBD7] text-center">
            <div className={`text-base font-medium mb-1 ${
              isOverBudget ? 'text-red-600' : 'text-[#332B42]'
            }`}>
              {formatCurrency(totalSpent)}
            </div>
            <div className="text-xs text-[#6B7280] font-work">Spent</div>
          </div>

          {/* Remaining */}
          <div className="bg-[#F8F6F4] p-3 rounded-lg border border-[#E0DBD7] text-center">
            <div className={`text-base font-medium mb-1 ${
              remaining < 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(remaining)}
            </div>
            <div className="text-xs text-[#6B7280] font-work flex items-center justify-center gap-1">
              {remaining >= 0 ? (
                <>
                  <TrendingUp className="w-3 h-3" />
                  Remaining
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  Over Budget
                </>
              )}
            </div>
          </div>

          {/* Budget Utilization */}
          <div className="bg-[#F8F6F4] p-3 rounded-lg border border-[#E0DBD7] text-center">
            <div className={`text-base font-medium mb-1 ${
              budgetUtilization > 100 ? 'text-red-600' : 
              budgetUtilization > 90 ? 'text-orange-600' : 
              'text-[#332B42]'
            }`}>
              {budgetUtilization.toFixed(1)}%
            </div>
            <div className="text-xs text-[#6B7280] font-work">Utilized</div>
          </div>
        </div>

        {/* Progress Bar - Full width below metrics */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#6B7280] font-work">Budget Progress</span>
            <span className="text-xs text-[#6B7280] font-work">
              {formatCurrency(totalSpent)} / {formatCurrency(maxBudget)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                budgetUtilization > 100 ? 'bg-red-500' :
                budgetUtilization > 90 ? 'bg-orange-500' :
                budgetUtilization > 75 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardBudgetMetrics;

