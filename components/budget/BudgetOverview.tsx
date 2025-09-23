import React, { useMemo, useCallback, useState } from 'react';
import { BudgetCategory } from '@/types/budget';
import { useRouter } from 'next/navigation';
import {
  BudgetOverviewHeader,
  CollapsibleSection,
  BudgetChartSection,
  KeyMetricsGrid,
  CategoryBreakdownList,
  CategoryBreakdownEmptyState,
  BudgetStatusSection,
  BudgetOverviewSkeleton,
  formatCurrency,
  calculateBudgetMetrics,
  prepareChartData,
  prepareCategoryBreakdown
} from './index';
import ConfirmationModal from '@/components/ConfirmationModal';

interface BudgetOverviewProps {
  budgetCategories: BudgetCategory[];
  budgetItems: any[];
  totalSpent: number;
  totalBudget: number;
  maxBudget: number;
  onShowAIAssistant: () => void;
  onShowAIAssistantDirect?: () => void;
  onAddCategory: () => void;
  onAddMultipleCategories?: (categories: Array<{name: string; amount: number}>) => void;
  onSelectCategory: (category: BudgetCategory) => void;
  onClearAllBudgetData: () => void;
  onUpdateMaxBudget?: (newAmount: number) => void;
  isLoading?: boolean;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = React.memo(({
  budgetCategories,
  budgetItems,
  totalSpent,
  totalBudget,
  maxBudget,
  onShowAIAssistant,
  onShowAIAssistantDirect,
  onAddCategory,
  onAddMultipleCategories,
  onSelectCategory,
  onClearAllBudgetData,
  onUpdateMaxBudget,
  isLoading = false,
}) => {
  const router = useRouter();
  
  const [collapsedSections, setCollapsedSections] = React.useState({
    chart: false,
    metrics: false,
    breakdown: false,
    status: false
  });

  const [showRemoveAllModal, setShowRemoveAllModal] = useState(false);

  // Memoized calculations for optimal performance
  const budgetMetrics = useMemo(() => 
    calculateBudgetMetrics(maxBudget, totalSpent),
    [maxBudget, totalSpent]
  );

  const chartData = useMemo(() => 
    prepareChartData(budgetCategories, budgetItems),
    [budgetCategories, budgetItems]
  );

  const categoryBreakdown = useMemo(() => 
    prepareCategoryBreakdown(budgetCategories, budgetItems).filter(cat => cat.id), // Filter out categories without IDs
    [budgetCategories, budgetItems]
  );

  const overBudgetCount = useMemo(() => 
    categoryBreakdown.filter(cat => cat.isOverBudget).length,
    [categoryBreakdown]
  );

  const underBudgetCount = useMemo(() => 
    categoryBreakdown.filter(cat => !cat.isOverBudget && cat.allocatedAmount > 0).length,
    [categoryBreakdown]
  );

  // Calculate projected spend (sum of all allocated amounts in categories)
  const projectedSpend = useMemo(() => 
    budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0),
    [budgetCategories]
  );

  // Calculate budget flexibility (max budget minus projected spend)
  const budgetFlexibility = useMemo(() => 
    maxBudget - projectedSpend,
    [maxBudget, projectedSpend]
  );

  // Memoized callback to prevent unnecessary re-renders
  const toggleSection = useCallback((section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Handle update max budget
  const handleUpdateMaxBudget = useCallback((newAmount: number) => {
    if (onUpdateMaxBudget) {
      onUpdateMaxBudget(newAmount);
    }
  }, [onUpdateMaxBudget]);

  // Handle remove all budget data
  const handleRemoveAllBudgetData = useCallback(() => {
    onClearAllBudgetData();
  }, [onClearAllBudgetData]);

  // Show skeleton while loading
  if (isLoading) {
    return <BudgetOverviewSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <BudgetOverviewHeader 
        title="Budget Overview"
        subtitle="Complete overview of your wedding budget and spending"
        onShowAIAssistant={onShowAIAssistant}
        onAddCategory={onAddCategory}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {/* Over Budget Alert Banner */}
        {budgetFlexibility < 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 font-work">
                  Uh oh! You're projected spend is {formatCurrency(Math.abs(budgetFlexibility))} over your max budget.
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Consider removing or editing a few items or increasing your max budget.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Left Column - Key Metrics, Budget Status, and Charts */}
          <div className="space-y-4">
            <CollapsibleSection
              title="Overview"
              isCollapsed={collapsedSections.metrics}
              onToggle={() => toggleSection('metrics')}
            >
              <KeyMetricsGrid
                maxBudget={maxBudget}
                totalSpent={totalSpent}
                totalRemaining={budgetMetrics.totalRemaining}
                budgetUtilization={budgetMetrics.budgetUtilization}
                isOverBudget={budgetMetrics.isOverBudget}
                projectedSpend={projectedSpend}
                budgetFlexibility={budgetFlexibility}
                formatCurrency={formatCurrency}
                onUpdateMaxBudget={handleUpdateMaxBudget}
              />
            </CollapsibleSection>

            {/* Status section commented out - Key Metrics provides better status information */}
            {/* <CollapsibleSection
              title="Status"
              isCollapsed={collapsedSections.status}
              onToggle={() => toggleSection('status')}
            >
              <BudgetStatusSection
                isOverBudget={budgetMetrics.isOverBudget}
                budgetUtilization={budgetMetrics.budgetUtilization}
                overBudgetCount={overBudgetCount}
                underBudgetCount={underBudgetCount}
              />
            </CollapsibleSection> */}

            <CollapsibleSection
              title="Spend by Category"
              isCollapsed={collapsedSections.chart}
              onToggle={() => toggleSection('chart')}
            >
              <BudgetChartSection 
                chartData={chartData}
                maxBudget={maxBudget}
              />
            </CollapsibleSection>
          </div>

          {/* Right Column - Category Breakdown (Extended Height) */}
          <div className="space-y-4">
            <CollapsibleSection
              title="Category Breakdown"
              isCollapsed={collapsedSections.breakdown}
              onToggle={() => toggleSection('breakdown')}
              headerAction={
                <button
                  onClick={() => setShowRemoveAllModal(true)}
                  className="text-red-800 hover:text-red-900 text-sm font-medium transition-colors"
                  title="Remove all budget data"
                >
                  Remove All
                </button>
              }
            >
              {/* Projected Spend Summary Row */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-[8px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Projected Spend for All Categories</span>
                  <span className="text-base font-semibold text-blue-800">{formatCurrency(projectedSpend)}</span>
                </div>
              </div>
              
              <div className="max-h-[40rem] overflow-y-auto">
                {categoryBreakdown.length > 0 ? (
                  <CategoryBreakdownList
                    categories={categoryBreakdown}
                    formatCurrency={formatCurrency}
                    onSelectCategory={(category) => {
                      // Find the full BudgetCategory object and pass it to the parent
                      const fullCategory = budgetCategories.find(cat => cat.id === category.id);
                      if (fullCategory) {
                        onSelectCategory(fullCategory);
                      }
                    }}
                  />
                ) : (
                  <CategoryBreakdownEmptyState
                    onShowAIAssistant={onShowAIAssistantDirect || onShowAIAssistant}
                    onAddCategory={onAddCategory}
                    onAddMultipleCategories={onAddMultipleCategories}
                    maxBudget={maxBudget}
                  />
                )}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Remove All Budget Data Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveAllModal}
        onClose={() => setShowRemoveAllModal(false)}
        onConfirm={handleRemoveAllBudgetData}
        title="Remove All Budget Data"
        message="Are you sure you want to remove all budget data? This will clear all categories, items, and reset your budget settings."
        warningMessage="This action cannot be undone. All budget data will be permanently deleted."
        confirmButtonText="Remove All"
        confirmButtonVariant="danger"
      />
    </div>
  );
});

BudgetOverview.displayName = 'BudgetOverview';

export default BudgetOverview;
