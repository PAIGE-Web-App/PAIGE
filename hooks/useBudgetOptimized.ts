import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useBudgetCategories } from './useBudgetCategories';
import { useBudgetItems } from './useBudgetItems';
import { useBudgetAI } from './useBudgetAI';
import { getUserCollectionRef } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { BudgetCategory, BudgetItem, AIGeneratedBudget } from '@/types/budget';

export function useBudgetOptimized() {
  const { user } = useAuth();
  
  // Use focused hooks for better separation of concerns
  const budgetCategoriesHook = useBudgetCategories();
  const budgetItemsHook = useBudgetItems();
  const budgetAIHook = useBudgetAI();

  // State for modals and UI
  const [showBudgetItemModal, setShowBudgetItemModal] = useState(false);
  const [showVendorIntegrationModal, setShowVendorIntegrationModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [selectedBudgetItem, setSelectedBudgetItem] = useState<BudgetItem | null>(null);
  const [userMaxBudget, setUserMaxBudget] = useState<number | null>(null);
  const [isCreatingBudget, setIsCreatingBudget] = useState(false);
  const [budgetCreationProgress, setBudgetCreationProgress] = useState<{
    current: number;
    total: number;
    currentItem: string;
  } | null>(null);

  // Load user max budget
  useEffect(() => {
    if (!user?.uid) return;

    const loadMaxBudget = async () => {
      try {
        const userRef = doc(getUserCollectionRef(user.uid, 'users'), user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as any;
          setUserMaxBudget(userData.maxBudget || null);
        }
      } catch (error) {
        console.error('Error loading max budget:', error);
      }
    };

    loadMaxBudget();
  }, [user?.uid]);

  // Memoized budget statistics for optimal performance
  const budgetStats = useMemo(() => {
    const totalSpent = budgetItemsHook.budgetItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAllocated = budgetCategoriesHook.budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0);
    const totalRemaining = totalAllocated - totalSpent;
    
    return {
      totalSpent,
      totalAllocated,
      totalRemaining,
      isOverBudget: totalSpent > totalAllocated,
      budgetUtilization: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0,
    };
  }, [budgetItemsHook.budgetItems, budgetCategoriesHook.budgetCategories]);

  // Memoized user total budget
  const userTotalBudget = useMemo(() => 
    budgetCategoriesHook.budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0),
    [budgetCategoriesHook.budgetCategories]
  );

  // Optimized handlers with proper memoization
  const handleClearAllBudgetData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      // Clear all categories and items
      await budgetCategoriesHook.handleDeleteAllCategories();
      
      // Clear all budget items
      const batch = budgetItemsHook.budgetItems.map(item => 
        budgetItemsHook.handleDeleteBudgetItem(item.id!)
      );
      await Promise.all(batch);

      setSelectedBudgetItem(null);
    } catch (error: any) {
      console.error('Error clearing all budget data:', error);
    }
  }, [user?.uid, budgetCategoriesHook, budgetItemsHook]);

  const updateUserMaxBudget = useCallback(async (newMaxBudget: number) => {
    if (!user?.uid) return;

    try {
      const userRef = doc(getUserCollectionRef(user.uid, 'users'), user.uid);
      await updateDoc(userRef, {
        maxBudget: newMaxBudget,
        updatedAt: new Date(),
      });

      setUserMaxBudget(newMaxBudget);
    } catch (error: any) {
      console.error('Error updating max budget:', error);
    }
  }, [user?.uid]);

  const createBudgetFromAI = useCallback(async (description: string, totalBudget: number, aiBudget: AIGeneratedBudget) => {
    if (!user?.uid) return;

    setIsCreatingBudget(true);
    setBudgetCreationProgress({ current: 0, total: aiBudget.categories.length, currentItem: 'Starting...' });

    try {
      // Create categories first
      for (let i = 0; i < aiBudget.categories.length; i++) {
        const category = aiBudget.categories[i];
        
        setBudgetCreationProgress({
          current: i + 1,
          total: aiBudget.categories.length,
          currentItem: `Creating ${category.name}...`
        });

        await budgetCategoriesHook.handleAddCategory(category.name, category.allocatedAmount);

        // Add items for this category
        if (category.items && category.items.length > 0) {
          for (const item of category.items) {
            await budgetItemsHook.handleAddBudgetItem(category.name, {
              name: item.name,
              amount: item.amount,
              notes: item.notes,
            });
          }
        }
      }

      setBudgetCreationProgress(null);
    } catch (error: any) {
      console.error('Error creating budget from AI:', error);
      setBudgetCreationProgress(null);
      throw error;
    } finally {
      setIsCreatingBudget(false);
    }
  }, [user?.uid, budgetCategoriesHook, budgetItemsHook]);

  const handleGenerateBudget = useCallback(async (description: string, totalBudget: number, aiBudget?: AIGeneratedBudget) => {
    try {
      const data = await budgetAIHook.handleGenerateBudget(description, totalBudget, aiBudget);
      await createBudgetFromAI(description, totalBudget, data);
    } catch (error: any) {
      console.error('Error generating budget:', error);
      throw error;
    }
  }, [budgetAIHook, createBudgetFromAI]);

  return {
    // State from focused hooks
    budgetCategories: budgetCategoriesHook.budgetCategories,
    budgetItems: budgetItemsHook.budgetItems,
    userMaxBudget,
    userTotalBudget,
    
    // Modal state
    showBudgetItemModal,
    showVendorIntegrationModal,
    showAIAssistant,
    showCSVUpload,
    selectedBudgetItem,
    isCreatingBudget,
    budgetCreationProgress,

    // Computed values
    totalSpent: budgetStats.totalSpent,
    totalRemaining: budgetStats.totalRemaining,
    budgetStats,

    // Setters
    setShowBudgetItemModal,
    setShowVendorIntegrationModal,
    setShowAIAssistant,
    setShowCSVUpload,
    setSelectedBudgetItem,
    setIsCreatingBudget,
    setBudgetCreationProgress,

    // Handlers from focused hooks
    handleAddCategory: budgetCategoriesHook.handleAddCategory,
    handleEditCategory: budgetCategoriesHook.handleEditCategory,
    handleDeleteCategory: budgetCategoriesHook.handleDeleteCategory,
    handleDeleteAllCategories: budgetCategoriesHook.handleDeleteAllCategories,
    handleAddBudgetItem: budgetItemsHook.handleAddBudgetItem,
    handleUpdateBudgetItem: budgetItemsHook.handleUpdateBudgetItem,
    handleDeleteBudgetItem: budgetItemsHook.handleDeleteBudgetItem,
    handleLinkVendor: budgetItemsHook.handleLinkVendor,

    // AI handlers
    handleGenerateBudget,
    handleGenerateTodoList: budgetAIHook.handleGenerateTodoList,
    handleGenerateIntegratedPlan: budgetAIHook.handleGenerateIntegratedPlan,

    // Utility handlers
    handleClearAllBudgetData,
    updateUserMaxBudget,
  };
}
