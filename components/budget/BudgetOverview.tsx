import React, { useMemo, useCallback, useState } from 'react';
import { BudgetCategory } from '@/types/budget';
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
  isLoading = false,
}) => {
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

  // Memoized callback to prevent unnecessary re-renders
  const toggleSection = useCallback((section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

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
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Left Column - Charts and Summary */}
          <div className="space-y-4">
            <CollapsibleSection
              title="Budget Spend by Category"
              isCollapsed={collapsedSections.chart}
              onToggle={() => toggleSection('chart')}
            >
              <BudgetChartSection 
                chartData={chartData}
                maxBudget={maxBudget}
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Key Metrics"
              isCollapsed={collapsedSections.metrics}
              onToggle={() => toggleSection('metrics')}
            >
              <KeyMetricsGrid
                maxBudget={maxBudget}
                totalSpent={totalSpent}
                totalRemaining={budgetMetrics.totalRemaining}
                budgetUtilization={budgetMetrics.budgetUtilization}
                isOverBudget={budgetMetrics.isOverBudget}
                formatCurrency={formatCurrency}
              />
            </CollapsibleSection>
          </div>

          {/* Right Column - Category Breakdown */}
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
                />
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Budget Status"
              isCollapsed={collapsedSections.status}
              onToggle={() => toggleSection('status')}
            >
              <BudgetStatusSection
                isOverBudget={budgetMetrics.isOverBudget}
                budgetUtilization={budgetMetrics.budgetUtilization}
                overBudgetCount={overBudgetCount}
                underBudgetCount={underBudgetCount}
              />
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
