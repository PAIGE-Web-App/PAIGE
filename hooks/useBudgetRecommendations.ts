import { useMemo } from 'react';
import type { BudgetItem, BudgetRecommendation } from '@/types/budget';

export function useBudgetRecommendations(budgetItems: BudgetItem[], totalBudget: number | null) {
  const recommendations = useMemo(() => {
    if (!totalBudget || budgetItems.length === 0) {
      return [];
    }

    const recs: BudgetRecommendation[] = [];
    const totalSpent = budgetItems.reduce((sum, item) => sum + item.amount, 0);
    const remainingBudget = totalBudget - totalSpent;

    // Budget optimization recommendations
    if (remainingBudget < 0) {
      recs.push({
        id: 'over-budget',
        userId: '',
        type: 'optimization',
        message: `You're $${Math.abs(remainingBudget).toLocaleString()} over budget. Consider reviewing high-cost items.`,
        potentialSavings: Math.abs(remainingBudget),
        priority: 'high',
        actionable: true,
        createdAt: new Date(),
      });
    } else if (remainingBudget > totalBudget * 0.2) {
      recs.push({
        id: 'under-budget',
        userId: '',
        type: 'optimization',
        message: `You have $${remainingBudget.toLocaleString()} remaining. Consider allocating to priority areas.`,
        priority: 'medium',
        actionable: true,
        createdAt: new Date(),
      });
    }

    // Category-specific recommendations
    const categoryTotals = budgetItems.reduce((acc, item) => {
      acc[item.categoryId] = (acc[item.categoryId] || 0) + item.amount;
      return acc;
    }, {} as Record<string, number>);

    // Find categories with high spending
    Object.entries(categoryTotals).forEach(([categoryId, amount]) => {
      const percentage = (amount / totalBudget) * 100;
      if (percentage > 30) {
        recs.push({
          id: `high-category-${categoryId}`,
          userId: '',
          type: 'category',
          message: `This category represents ${percentage.toFixed(1)}% of your budget. Consider if this allocation aligns with your priorities.`,
          categoryId,
          priority: 'medium',
          actionable: true,
          createdAt: new Date(),
        });
      }
    });

    // Vendor integration recommendations
    const itemsWithoutVendors = budgetItems.filter(item => !item.vendorId);
    if (itemsWithoutVendors.length > 0) {
      recs.push({
        id: 'link-vendors',
        userId: '',
        type: 'vendor',
        message: `${itemsWithoutVendors.length} budget items aren't linked to vendors. Link them to get better tracking and recommendations.`,
        priority: 'low',
        actionable: true,
        createdAt: new Date(),
      });
    }

    // Todo integration recommendations
    const completedItems = budgetItems.filter(item => item.isCompleted);
    const pendingItems = budgetItems.filter(item => !item.isCompleted);
    
    if (pendingItems.length > 0) {
      recs.push({
        id: 'create-todos',
        userId: '',
        type: 'todo',
        message: `Create todo items for ${pendingItems.length} pending budget items to track your planning progress.`,
        priority: 'medium',
        actionable: true,
        createdAt: new Date(),
      });
    }

    return recs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [budgetItems, totalBudget]);

  return {
    recommendations,
    hasRecommendations: recommendations.length > 0,
    highPriorityRecommendations: recommendations.filter(r => r.priority === 'high'),
    actionableRecommendations: recommendations.filter(r => r.actionable),
  };
} 