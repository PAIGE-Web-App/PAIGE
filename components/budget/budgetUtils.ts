import { BudgetCategory } from '@/types/budget';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const calculateBudgetMetrics = (
  maxBudget: number,
  totalSpent: number
) => {
  const totalRemaining = maxBudget - totalSpent;
  const budgetUtilization = maxBudget > 0 ? (totalSpent / maxBudget) * 100 : 0;
  const isOverBudget = totalSpent > maxBudget;

  return {
    totalRemaining,
    budgetUtilization,
    isOverBudget
  };
};

export const prepareChartData = (
  budgetCategories: BudgetCategory[],
  budgetItems: any[]
) => {
  return budgetCategories
    .map(category => {
      const categoryItems = budgetItems.filter(item => item.categoryId === category.id);
      const spent = categoryItems.reduce((sum, item) => sum + item.amount, 0);
      return {
        id: category.id!,
        name: category.name,
        amount: spent,
        color: category.color || '#A85C36'
      };
    })
    .filter(category => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);
};

export const prepareCategoryBreakdown = (
  budgetCategories: BudgetCategory[],
  budgetItems: any[]
) => {
  return budgetCategories.map(category => {
    const categoryItems = budgetItems.filter(item => item.categoryId === category.id);
    const spent = categoryItems.reduce((sum, item) => sum + item.amount, 0);
    const remaining = category.allocatedAmount - spent;
    const utilization = category.allocatedAmount > 0 ? (spent / category.allocatedAmount) * 100 : 0;
    
    return {
      ...category,
      spent,
      remaining,
      utilization,
      itemCount: categoryItems.length,
      isOverBudget: spent > category.allocatedAmount
    };
  }).sort((a, b) => b.allocatedAmount - a.allocatedAmount);
};
