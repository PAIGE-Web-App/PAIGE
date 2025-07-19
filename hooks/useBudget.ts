import { useState, useEffect, useMemo } from 'react';
import { useCustomToast } from './useCustomToast';
import { useAuth } from './useAuth';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import type { BudgetCategory, BudgetItem, AIGeneratedBudget, AIGeneratedTodoList, IntegratedPlan } from '@/types/budget';

const DEFAULT_CATEGORIES = [
  { name: 'Venue & Location', allocatedAmount: 0, color: '#A85C36' },
  { name: 'Catering & Food', allocatedAmount: 0, color: '#8B4513' },
  { name: 'Photography & Video', allocatedAmount: 0, color: '#2F4F4F' },
  { name: 'Attire & Accessories', allocatedAmount: 0, color: '#8A2BE2' },
  { name: 'Flowers & Decor', allocatedAmount: 0, color: '#FF69B4' },
  { name: 'Music & Entertainment', allocatedAmount: 0, color: '#32CD32' },
  { name: 'Transportation', allocatedAmount: 0, color: '#4169E1' },
  { name: 'Wedding Rings', allocatedAmount: 0, color: '#FFD700' },
  { name: 'Stationery & Paper', allocatedAmount: 0, color: '#DC143C' },
  { name: 'Beauty & Health', allocatedAmount: 0, color: '#FF1493' },
  { name: 'Wedding Planner', allocatedAmount: 0, color: '#00CED1' },
  { name: 'Miscellaneous', allocatedAmount: 0, color: '#696969' },
];

export function useBudget() {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  // State for budget categories
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);

  // State for modals
  const [showBudgetItemModal, setShowBudgetItemModal] = useState(false);
  const [showVendorIntegrationModal, setShowVendorIntegrationModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);

  // State for selected items
  const [selectedBudgetItem, setSelectedBudgetItem] = useState<BudgetItem | null>(null);
  const [userBudgetRange, setUserBudgetRange] = useState<{ min: number; max: number } | null>(null);

  // Fetch budget categories
  useEffect(() => {
    if (!user) return;

    // Follow existing architecture - no need for userId filter since getUserCollectionRef already scopes to user
    const q = query(
      getUserCollectionRef('budgetCategories', user.uid),
      orderBy('orderIndex', 'asc')
    );

    const unsubscribeCategories = onSnapshot(q, (snapshot) => {
      const categories: BudgetCategory[] = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name,
          allocatedAmount: data.allocatedAmount || 0,
          spentAmount: data.spentAmount || 0,
          orderIndex: data.orderIndex || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          color: data.color,
        };
      });

      // If no categories exist, create default ones
      if (categories.length === 0) {
        createDefaultCategories();
      } else {
        setBudgetCategories(categories);
      }
    }, (error) => {
      console.error('Error fetching budget categories:', error);
      setBudgetCategories([]);
    });

    return () => unsubscribeCategories();
  }, [user]);

  // Fetch user's budget range from profile
  useEffect(() => {
    if (!user) return;

    const fetchUserBudget = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.budgetRange && userData.budgetRange.min && userData.budgetRange.max) {
            setUserBudgetRange({
              min: userData.budgetRange.min,
              max: userData.budgetRange.max
            });
          } else {
            setUserBudgetRange(null);
          }
        }
      } catch (error) {
        console.error('Error fetching user budget:', error);
        setUserBudgetRange(null);
      }
    };

    fetchUserBudget();
  }, [user]);

  // Fetch budget items
  useEffect(() => {
    if (!user) return;

    // Follow existing architecture - no need for userId filter since getUserCollectionRef already scopes to user
    const q = query(
      getUserCollectionRef('budgetItems', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      const items: BudgetItem[] = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          userId: data.userId,
          categoryId: data.categoryId,
          name: data.name,
          amount: data.amount || 0,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          vendorPlaceId: data.vendorPlaceId,
          notes: data.notes,
          isCustom: data.isCustom || false,
          isCompleted: data.isCompleted || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });
      setBudgetItems(items);
    }, (error) => {
      console.error('Error fetching budget items:', error);
      setBudgetItems([]);
    });

    return () => unsubscribeItems();
  }, [user]);

  // Create default categories
  const createDefaultCategories = async () => {
    if (!user) return;

    try {
      // First, check if user has budget range from signup
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      let userBudgetRange: { min: number; max: number } | null = null;
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userBudgetRange = userData.budgetRange || null;
      }

      const batch = writeBatch(getUserCollectionRef('budgetCategories', user.uid).firestore);
      
      // If user has a budget range, distribute it across categories
      if (userBudgetRange && userBudgetRange.min && userBudgetRange.max) {
        const totalBudget = (userBudgetRange.min + userBudgetRange.max) / 2; // Use average
        const categoryPercentages = [
          { name: 'Venue & Location', percentage: 0.40, color: '#A85C36' },
          { name: 'Catering & Food', percentage: 0.25, color: '#8B4513' },
          { name: 'Photography & Video', percentage: 0.12, color: '#2F4F4F' },
          { name: 'Attire & Accessories', percentage: 0.08, color: '#8A2BE2' },
          { name: 'Flowers & Decor', percentage: 0.06, color: '#FF69B4' },
          { name: 'Music & Entertainment', percentage: 0.04, color: '#32CD32' },
          { name: 'Transportation', percentage: 0.02, color: '#4169E1' },
          { name: 'Wedding Rings', percentage: 0.03, color: '#FFD700' },
          { name: 'Stationery & Paper', percentage: 0.02, color: '#DC143C' },
          { name: 'Beauty & Health', percentage: 0.02, color: '#FF1493' },
          { name: 'Wedding Planner', percentage: 0.03, color: '#00CED1' },
          { name: 'Miscellaneous', percentage: 0.03, color: '#696969' },
        ];

        categoryPercentages.forEach((category, index) => {
          const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid));
          batch.set(categoryRef, {
            name: category.name,
            allocatedAmount: Math.round(totalBudget * category.percentage),
            spentAmount: 0,
            orderIndex: index,
            userId: user.uid,
            createdAt: new Date(),
            color: category.color,
          });
        });
      } else {
        // Use default categories with 0 allocated amounts
        DEFAULT_CATEGORIES.forEach((category, index) => {
          const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid));
          batch.set(categoryRef, {
            name: category.name,
            allocatedAmount: category.allocatedAmount,
            spentAmount: 0,
            orderIndex: index,
            userId: user.uid,
            createdAt: new Date(),
            color: category.color,
          });
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  // Function to update budget categories when budget range changes
  const updateBudgetCategoriesFromRange = async (newBudgetRange: { min: number; max: number }) => {
    if (!user) return;

    try {
      const totalBudget = (newBudgetRange.min + newBudgetRange.max) / 2;
      const categoryPercentages = [
        { name: 'Venue & Location', percentage: 0.40 },
        { name: 'Catering & Food', percentage: 0.25 },
        { name: 'Photography & Video', percentage: 0.12 },
        { name: 'Attire & Accessories', percentage: 0.08 },
        { name: 'Flowers & Decor', percentage: 0.06 },
        { name: 'Music & Entertainment', percentage: 0.04 },
        { name: 'Transportation', percentage: 0.02 },
        { name: 'Wedding Rings', percentage: 0.03 },
        { name: 'Stationery & Paper', percentage: 0.02 },
        { name: 'Beauty & Health', percentage: 0.02 },
        { name: 'Wedding Planner', percentage: 0.03 },
        { name: 'Miscellaneous', percentage: 0.03 },
      ];

      const batch = writeBatch(getUserCollectionRef('budgetCategories', user.uid).firestore);
      
      // Update existing categories with new allocations
      budgetCategories.forEach((category, index) => {
        if (index < categoryPercentages.length) {
          const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid), category.id);
          batch.update(categoryRef, {
            allocatedAmount: Math.round(totalBudget * categoryPercentages[index].percentage),
          });
        }
      });

      await batch.commit();
      showSuccessToast('Budget categories updated to match your new budget range!');
    } catch (error) {
      console.error('Error updating budget categories:', error);
      showErrorToast('Failed to update budget categories.');
    }
  };

  // Calculate budget statistics
  const budgetStats = useMemo(() => {
    const totalSpent = budgetItems.reduce((sum, item) => sum + item.amount, 0);
    const totalAllocated = budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0);
    const totalRemaining = totalAllocated - totalSpent;
    const spentPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    const categoryBreakdown = budgetCategories.map(category => {
      const categoryItems = budgetItems.filter(item => item.categoryId === category.id);
      const categorySpent = categoryItems.reduce((sum, item) => sum + item.amount, 0);
      const categoryRemaining = category.allocatedAmount - categorySpent;
      const categoryPercentage = category.allocatedAmount > 0 ? (categorySpent / category.allocatedAmount) * 100 : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        allocated: category.allocatedAmount,
        spent: categorySpent,
        remaining: categoryRemaining,
        percentage: categoryPercentage,
      };
    });

    return {
      totalBudget: totalAllocated,
      totalSpent,
      totalRemaining,
      spentPercentage,
      categoryBreakdown,
    };
  }, [budgetCategories, budgetItems]);

  // Add new category
  const handleAddCategory = async (name: string, allocatedAmount: number = 0) => {
    if (!user) return;

    if (!name.trim()) {
      showErrorToast('Category name cannot be empty.');
      return;
    }

    try {
      const maxOrderIndex = budgetCategories.length > 0 ? Math.max(...budgetCategories.map(cat => cat.orderIndex)) : -1;
      await addDoc(getUserCollectionRef('budgetCategories', user.uid), {
        name: name.trim(),
        allocatedAmount,
        spentAmount: 0,
        orderIndex: maxOrderIndex + 1,
        userId: user.uid,
        createdAt: new Date(),
      });

      showSuccessToast(`Category "${name}" added!`);
    } catch (error: any) {
      console.error('Error adding category:', error);
      showErrorToast(`Failed to add category: ${error.message}`);
    }
  };

  // Edit category
  const handleEditCategory = async (categoryId: string, updates: Partial<BudgetCategory>) => {
    if (!user) return;

    try {
      const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid), categoryId);
      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: new Date(),
      });

      showSuccessToast('Category updated!');
    } catch (error: any) {
      console.error('Error updating category:', error);
      showErrorToast(`Failed to update category: ${error.message}`);
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;

    try {
      // Delete all items in the category
      const categoryItems = budgetItems.filter(item => item.categoryId === categoryId);
      const batch = writeBatch(getUserCollectionRef('budgetItems', user.uid).firestore);
      
      categoryItems.forEach(item => {
        const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), item.id);
        batch.delete(itemRef);
      });

      // Delete the category
      const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid), categoryId);
      batch.delete(categoryRef);

      await batch.commit();
      showSuccessToast('Category deleted!');
    } catch (error: any) {
      console.error('Error deleting category:', error);
      showErrorToast(`Failed to delete category: ${error.message}`);
    }
  };

  // Add budget item
  const handleAddBudgetItem = async (categoryId: string, itemData: Partial<BudgetItem>) => {
    if (!user) return;

    if (!itemData.name?.trim()) {
      showErrorToast('Item name cannot be empty.');
      return;
    }

    try {
      await addDoc(getUserCollectionRef('budgetItems', user.uid), {
        categoryId,
        name: itemData.name.trim(),
        amount: itemData.amount || 0,
        vendorId: itemData.vendorId,
        vendorName: itemData.vendorName,
        vendorPlaceId: itemData.vendorPlaceId,
        notes: itemData.notes,
        isCustom: itemData.isCustom || false,
        isCompleted: false,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      showSuccessToast(`Budget item "${itemData.name}" added!`);
    } catch (error: any) {
      console.error('Error adding budget item:', error);
      showErrorToast(`Failed to add budget item: ${error.message}`);
    }
  };

  // Update budget item
  const handleUpdateBudgetItem = async (itemId: string, updates: Partial<BudgetItem>) => {
    if (!user) return;

    try {
      const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: new Date(),
      });

      showSuccessToast('Budget item updated!');
    } catch (error: any) {
      console.error('Error updating budget item:', error);
      showErrorToast(`Failed to update budget item: ${error.message}`);
    }
  };

  // Delete budget item
  const handleDeleteBudgetItem = async (itemId: string) => {
    if (!user) return;

    try {
      const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), itemId);
      await deleteDoc(itemRef);
      showSuccessToast('Budget item deleted!');
    } catch (error: any) {
      console.error('Error deleting budget item:', error);
      showErrorToast(`Failed to delete budget item: ${error.message}`);
    }
  };

  // Edit budget item (opens modal)
  const handleEditBudgetItem = (item: BudgetItem) => {
    setSelectedBudgetItem(item);
    setShowBudgetItemModal(true);
  };

  // Link vendor to budget item
  const handleLinkVendor = async (itemId: string, vendorData: { vendorId: string; vendorName: string; vendorPlaceId: string }) => {
    if (!user) return;

    try {
      const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), itemId);
      await updateDoc(itemRef, {
        vendorId: vendorData.vendorId,
        vendorName: vendorData.vendorName,
        vendorPlaceId: vendorData.vendorPlaceId,
        updatedAt: new Date(),
      });

      showSuccessToast('Vendor linked to budget item!');
    } catch (error: any) {
      console.error('Error linking vendor:', error);
      showErrorToast(`Failed to link vendor: ${error.message}`);
    }
  };

  // AI Integration Functions
  const handleGenerateBudget = async (description: string, totalBudget: number) => {
    try {
      const response = await fetch('/api/generate-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, totalBudget }),
      });

      if (!response.ok) throw new Error('Failed to generate budget');
      const data: AIGeneratedBudget = await response.json();
      
      // Create the budget from AI response
      await createBudgetFromAI(data);
      
      showSuccessToast('AI budget generated successfully!');
    } catch (error: any) {
      console.error('Error generating budget:', error);
      showErrorToast(`Failed to generate budget: ${error.message}`);
    }
  };

  const handleGenerateTodoList = async (description: string) => {
    try {
      const response = await fetch('/api/generate-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description,
          categories: budgetCategories.map(cat => cat.name),
          budgetIntegration: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate todo list');
      const data: AIGeneratedTodoList = await response.json();
      
      // Create todo list from AI response
      await createTodoListFromAI(data);
      
      showSuccessToast('AI todo list generated successfully!');
    } catch (error: any) {
      console.error('Error generating todo list:', error);
      showErrorToast(`Failed to generate todo list: ${error.message}`);
    }
  };

  const handleGenerateIntegratedPlan = async (description: string, totalBudget: number) => {
    try {
      console.log('Generating integrated plan:', { description, totalBudget });
      
      // Get wedding date from user profile
      let weddingDate: string | null = null;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.weddingDate?.seconds) {
            weddingDate = new Date(userData.weddingDate.seconds * 1000).toISOString().split('T')[0];
          }
        }
      }

      const response = await fetch('/api/generate-integrated-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, totalBudget, weddingDate }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate integrated plan: ${response.status} - ${errorText}`);
      }
      
      const data: IntegratedPlan = await response.json();
      console.log('Integrated plan response:', data);
      
      // Create both budget and todo list from integrated plan
      await createBudgetFromAI(data.budget);
      await createTodoListFromAI(data.todoList);
      
      showSuccessToast('Integrated plan generated successfully!');
    } catch (error: any) {
      console.error('Error generating integrated plan:', error);
      showErrorToast(`Failed to generate integrated plan: ${error.message}`);
    }
  };

  // Helper functions for AI integration
  const createBudgetFromAI = async (aiBudget: AIGeneratedBudget) => {
    if (!user) return;

    const batch = writeBatch(getUserCollectionRef('budgetCategories', user.uid).firestore);
    
    // Create categories and items from AI response
    for (const category of aiBudget.categories) {
      const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid));
      batch.set(categoryRef, {
        name: category.name,
        allocatedAmount: category.allocatedAmount,
        spentAmount: 0,
        orderIndex: budgetCategories.length,
        userId: user.uid,
        createdAt: new Date(),
      });

      // Add items for this category
      for (const item of category.items) {
        const itemRef = doc(getUserCollectionRef('budgetItems', user.uid));
        batch.set(itemRef, {
          categoryId: categoryRef.id,
          name: item.name,
          amount: item.amount,
          notes: item.notes,
          isCustom: false,
          isCompleted: false,
          userId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    await batch.commit();
  };

  const createTodoListFromAI = async (aiTodoList: AIGeneratedTodoList) => {
    if (!user) return;

    try {
      // Use your existing todo list creation system
      // This integrates with the existing useTodoLists hook
      const todoListData = {
        name: aiTodoList.name,
        tasks: aiTodoList.tasks.map((task: any) => ({
          name: task.name,
          note: task.note || '',
          deadline: task.deadline ? new Date(task.deadline) : null,
          endDate: task.endDate ? new Date(task.endDate) : null,
          category: task.category || 'Planning'
        }))
      };

      // Create the todo list using the existing system
      // This will trigger the existing todo list creation flow
      const event = new CustomEvent('create-todo-list-from-ai', {
        detail: todoListData
      });
      window.dispatchEvent(event);

      showSuccessToast(`Todo list "${aiTodoList.name}" created successfully!`);
    } catch (error: any) {
      console.error('Error creating todo list from AI:', error);
      showErrorToast(`Failed to create todo list: ${error.message}`);
    }
  };

  // Calculate average budget for backward compatibility
  const userTotalBudget = userBudgetRange ? Math.round((userBudgetRange.min + userBudgetRange.max) / 2) : null;

  return {
    // State
    budgetCategories,
    budgetItems,
    budgetStats,
    userBudgetRange,
    userTotalBudget,
    showBudgetItemModal,
    showVendorIntegrationModal,
    showAIAssistant,
    showCSVUpload,
    selectedBudgetItem,

    // Computed values
    totalSpent: budgetStats.totalSpent,
    totalRemaining: budgetStats.totalRemaining,

    // Setters
    setShowBudgetItemModal,
    setShowVendorIntegrationModal,
    setShowAIAssistant,
    setShowCSVUpload,
    setSelectedBudgetItem,

    // Handlers
    handleAddCategory,
    handleEditCategory,
    handleDeleteCategory,
    handleAddBudgetItem,
    handleUpdateBudgetItem,
    handleDeleteBudgetItem,
    handleEditBudgetItem,
    handleLinkVendor,
    handleGenerateBudget,
    handleGenerateTodoList,
    handleGenerateIntegratedPlan,
    updateBudgetCategoriesFromRange,
  };
} 