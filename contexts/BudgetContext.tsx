import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useBudget } from '@/hooks/useBudget';
import type { BudgetCategory, BudgetItem } from '@/types/budget';

interface BudgetContextType {
  // Data
  budgetCategories: BudgetCategory[];
  budgetItems: BudgetItem[];
  selectedCategory: BudgetCategory | null;
  totalSpent: number;
  totalBudget: number | null;
  budgetRange: { min: number; max: number } | null;
  budgetStats: any;
  
  // Actions
  setSelectedCategory: (category: BudgetCategory | null) => void;
  handleAddCategory: (name: string, allocatedAmount?: number, showToast?: boolean, showCompletion?: boolean) => Promise<string | null>;
  handleAddMultipleCategories: (categories: Array<{name: string; amount: number; color?: string; items?: Array<{name: string; amount: number; notes?: string; dueDate?: Date}>}>) => Promise<void>;
  handleEditCategory: (categoryId: string, updates: Partial<BudgetCategory>) => Promise<void>;
  handleDeleteCategory: (categoryId: string) => Promise<void>;
  handleAddBudgetItem: (categoryId: string, itemData: Partial<BudgetItem>, showToast?: boolean) => Promise<void>;
  handleUpdateBudgetItem: (itemId: string, updates: Partial<BudgetItem>) => Promise<void>;
  handleDeleteBudgetItem: (itemId: string) => Promise<void>;
  handleLinkVendor: (itemId: string, vendorData: any) => Promise<void>;
  handleAssignBudgetItem: (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[], itemId?: string) => Promise<void>;
  
  // Modal states
  showBudgetItemModal: boolean;
  setShowBudgetItemModal: (show: boolean) => void;
  selectedBudgetItem: BudgetItem | null;
  setSelectedBudgetItem: (item: BudgetItem | null) => void;
  showAIAssistant: boolean;
  setShowAIAssistant: (show: boolean) => void;
  
  // Computed values
  filteredBudgetItems: BudgetItem[];
  categoryBreakdown: any[];
  isLoading: boolean;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const useBudgetContext = () => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudgetContext must be used within a BudgetProvider');
  }
  return context;
};

interface BudgetProviderProps {
  children: React.ReactNode;
  selectedCategory: BudgetCategory | null;
  setSelectedCategory: (category: BudgetCategory | null) => void;
}

export const BudgetProvider: React.FC<BudgetProviderProps> = ({
  children,
  selectedCategory,
  setSelectedCategory,
}) => {
  const budget = useBudget();

  // Memoized computed values
  const filteredBudgetItems = useMemo(() => {
    if (!selectedCategory) return [];
    return budget.budgetItems.filter(item => item.categoryId === selectedCategory.id);
  }, [budget.budgetItems, selectedCategory]);

  const categoryBreakdown = useMemo(() => {
    return budget.budgetStats?.categoryBreakdown || [];
  }, [budget.budgetStats?.categoryBreakdown]);

  const isLoading = useMemo(() => {
    return budget.budgetCategories === undefined;
  }, [budget.budgetCategories]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    // Data
    budgetCategories: budget.budgetCategories,
    budgetItems: budget.budgetItems,
    selectedCategory,
    totalSpent: budget.totalSpent,
    totalBudget: budget.userTotalBudget,
    budgetRange: budget.userMaxBudget ? { min: budget.userMaxBudget * 0.8, max: budget.userMaxBudget } : null,
    budgetStats: budget.budgetStats,
    
    // Actions
    setSelectedCategory,
    handleAddCategory: budget.handleAddCategory,
    handleAddMultipleCategories: budget.handleAddMultipleCategories,
    handleEditCategory: budget.handleEditCategory,
    handleDeleteCategory: budget.handleDeleteCategory,
    handleAddBudgetItem: budget.handleAddBudgetItem,
    handleUpdateBudgetItem: budget.handleUpdateBudgetItem,
    handleDeleteBudgetItem: budget.handleDeleteBudgetItem,
    handleLinkVendor: budget.handleLinkVendor,
    handleAssignBudgetItem: budget.handleAssignBudgetItem,
    
    // Modal states
    showBudgetItemModal: budget.showBudgetItemModal,
    setShowBudgetItemModal: budget.setShowBudgetItemModal,
    selectedBudgetItem: budget.selectedBudgetItem,
    setSelectedBudgetItem: budget.setSelectedBudgetItem,
    showAIAssistant: budget.showAIAssistant,
    setShowAIAssistant: budget.setShowAIAssistant,
    
    // Computed values
    filteredBudgetItems,
    categoryBreakdown,
    isLoading,
  }), [
    budget.budgetCategories,
    budget.budgetItems,
    selectedCategory,
    budget.totalSpent,
    budget.userTotalBudget,
    budget.userMaxBudget,
    budget.budgetStats,
    budget.handleAddCategory,
    budget.handleAddMultipleCategories,
    budget.handleEditCategory,
    budget.handleDeleteCategory,
    budget.handleAddBudgetItem,
    budget.handleUpdateBudgetItem,
    budget.handleDeleteBudgetItem,
    budget.handleLinkVendor,
    budget.handleAssignBudgetItem,
    budget.showBudgetItemModal,
    budget.setShowBudgetItemModal,
    budget.selectedBudgetItem,
    budget.setSelectedBudgetItem,
    budget.showAIAssistant,
    budget.setShowAIAssistant,
    filteredBudgetItems,
    categoryBreakdown,
    isLoading,
  ]);

  return (
    <BudgetContext.Provider value={contextValue}>
      {children}
    </BudgetContext.Provider>
  );
}; 