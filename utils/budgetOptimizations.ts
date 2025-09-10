/**
 * Budget Optimization Utilities
 * 
 * This file contains optimized utility functions for budget-related operations
 * to improve performance and maintainability.
 */

import type { BudgetCategory, BudgetItem } from '@/types/budget';

// Optimized budget calculations with memoization support
export const budgetCalculations = {
  /**
   * Calculate total spent amount from budget items
   */
  calculateTotalSpent: (budgetItems: BudgetItem[]): number => {
    return budgetItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  },

  /**
   * Calculate total allocated amount from budget categories
   */
  calculateTotalAllocated: (budgetCategories: BudgetCategory[]): number => {
    return budgetCategories.reduce((sum, category) => sum + (category.allocatedAmount || 0), 0);
  },

  /**
   * Calculate budget utilization percentage
   */
  calculateBudgetUtilization: (totalSpent: number, totalAllocated: number): number => {
    if (totalAllocated === 0) return 0;
    return Math.min((totalSpent / totalAllocated) * 100, 100);
  },

  /**
   * Check if budget is over allocated
   */
  isOverBudget: (totalSpent: number, totalAllocated: number): boolean => {
    return totalSpent > totalAllocated;
  },

  /**
   * Calculate remaining budget
   */
  calculateRemainingBudget: (totalAllocated: number, totalSpent: number): number => {
    return Math.max(totalAllocated - totalSpent, 0);
  },

  /**
   * Get budget status based on utilization
   */
  getBudgetStatus: (utilization: number): 'healthy' | 'warning' | 'critical' => {
    if (utilization >= 90) return 'critical';
    if (utilization >= 75) return 'warning';
    return 'healthy';
  }
};

// Optimized category operations
export const categoryOperations = {
  /**
   * Get category by ID with null safety
   */
  getCategoryById: (categories: BudgetCategory[], id: string): BudgetCategory | null => {
    return categories.find(cat => cat.id === id) || null;
  },

  /**
   * Get category by name with null safety
   */
  getCategoryByName: (categories: BudgetCategory[], name: string): BudgetCategory | null => {
    return categories.find(cat => cat.name === name) || null;
  },

  /**
   * Get items for a specific category
   */
  getItemsForCategory: (items: BudgetItem[], categoryId: string): BudgetItem[] => {
    return items.filter(item => item.categoryId === categoryId);
  },

  /**
   * Calculate category spent amount
   */
  calculateCategorySpent: (items: BudgetItem[], categoryId: string): number => {
    return items
      .filter(item => item.categoryId === categoryId)
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  },

  /**
   * Check if category is over budget
   */
  isCategoryOverBudget: (category: BudgetCategory, items: BudgetItem[]): boolean => {
    const spent = categoryOperations.calculateCategorySpent(items, category.id!);
    return spent > category.allocatedAmount;
  }
};

// Optimized validation functions
export const budgetValidation = {
  /**
   * Validate budget amount
   */
  validateBudgetAmount: (amount: number): { isValid: boolean; error?: string } => {
    if (amount < 0) return { isValid: false, error: 'Budget amount cannot be negative' };
    if (amount > 1000000) return { isValid: false, error: 'Budget amount cannot exceed $1,000,000' };
    if (!Number.isFinite(amount)) return { isValid: false, error: 'Budget amount must be a valid number' };
    return { isValid: true };
  },

  /**
   * Validate category name
   */
  validateCategoryName: (name: string): { isValid: boolean; error?: string } => {
    if (!name || name.trim().length === 0) return { isValid: false, error: 'Category name is required' };
    if (name.length > 100) return { isValid: false, error: 'Category name cannot exceed 100 characters' };
    return { isValid: true };
  },

  /**
   * Validate budget item
   */
  validateBudgetItem: (item: Partial<BudgetItem>): { isValid: boolean; error?: string } => {
    if (!item.name || item.name.trim().length === 0) {
      return { isValid: false, error: 'Item name is required' };
    }
    
    if (item.amount !== undefined) {
      const amountValidation = budgetValidation.validateBudgetAmount(item.amount);
      if (!amountValidation.isValid) return amountValidation;
    }
    
    return { isValid: true };
  }
};

// Optimized formatting functions
export const budgetFormatting = {
  /**
   * Format currency with proper locale
   */
  formatCurrency: (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  /**
   * Format percentage
   */
  formatPercentage: (value: number, decimals: number = 1): string => {
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Format budget range
   */
  formatBudgetRange: (min: number, max: number): string => {
    return `${budgetFormatting.formatCurrency(min)} - ${budgetFormatting.formatCurrency(max)}`;
  },

  /**
   * Format large numbers with K/M suffixes
   */
  formatLargeNumber: (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }
};

// Optimized color utilities
export const budgetColors = {
  /**
   * Default category colors
   */
  DEFAULT_CATEGORY_COLORS: {
    'Venue & Location': '#A85C36',
    'Catering & Food': '#8B4513',
    'Photography & Video': '#2F4F4F',
    'Attire & Accessories': '#8A2BE2',
    'Flowers & Decor': '#FF69B4',
    'Music & Entertainment': '#32CD32',
    'Transportation': '#4169E1',
    'Wedding Rings': '#FFD700',
    'Stationery & Paper': '#DC143C',
    'Beauty & Health': '#FF1493',
    'Wedding Planner': '#00CED1',
    'Miscellaneous': '#696969',
  } as const,

  /**
   * Get color for category name
   */
  getCategoryColor: (categoryName: string): string => {
    return budgetColors.DEFAULT_CATEGORY_COLORS[categoryName as keyof typeof budgetColors.DEFAULT_CATEGORY_COLORS] || '#696969';
  },

  /**
   * Get status color based on budget utilization
   */
  getStatusColor: (utilization: number): string => {
    if (utilization >= 90) return '#EF4444'; // Red
    if (utilization >= 75) return '#F59E0B'; // Yellow
    return '#10B981'; // Green
  }
};

// Optimized performance utilities
export const performanceUtils = {
  /**
   * Debounce function for input handling
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * Throttle function for scroll/resize events
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Memoize expensive calculations
   */
  memoize: <T extends (...args: any[]) => any>(fn: T): T => {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }
};

// Export all utilities as a single object for easy importing
export const budgetUtils = {
  calculations: budgetCalculations,
  categories: categoryOperations,
  validation: budgetValidation,
  formatting: budgetFormatting,
  colors: budgetColors,
  performance: performanceUtils,
};
