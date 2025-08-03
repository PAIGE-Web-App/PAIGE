import { useState, useEffect, useMemo, useCallback } from 'react';
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
  limit,
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

// Memoized date processing function
const processDate = (dateField: any): Date | undefined => {
  if (!dateField) return undefined;
  if (typeof dateField.toDate === 'function') return dateField.toDate();
  if (dateField instanceof Date) return dateField;
  return undefined;
};

// Memoized category data transformation
const transformCategoryData = (doc: any): BudgetCategory => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    name: data.name,
    allocatedAmount: data.allocatedAmount || 0,
    spentAmount: data.spentAmount || 0,
    orderIndex: data.orderIndex || 0,
    createdAt: processDate(data.createdAt) || new Date(),
    color: data.color,
  };
};

// Memoized budget item data transformation
const transformBudgetItemData = (doc: any): BudgetItem => {
  const data = doc.data();
  return {
    id: doc.id,
    categoryId: data.categoryId,
    name: data.name,
    notes: data.notes || data.description || '',
    amount: data.amount || 0,
    isCustom: data.isCustom || false,
    isCompleted: data.isCompleted || false,
    createdAt: processDate(data.createdAt) || new Date(),
    updatedAt: processDate(data.updatedAt) || new Date(),
    userId: data.userId,
    vendorId: data.vendorId,
    vendorName: data.vendorName,
    vendorPlaceId: data.vendorPlaceId,
    assignedTo: data.assignedTo || null,
    assignedBy: data.assignedBy || null,
    assignedAt: processDate(data.assignedAt),
    notificationRead: data.notificationRead || false,
  };
};

export function useBudgetOptimized() {
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
  const [userMaxBudget, setUserMaxBudget] = useState<number | null>(null);

  // Memoized budget statistics
  const budgetStats = useMemo(() => {
    const totalBudget = budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0);
    const totalSpent = budgetCategories.reduce((sum, category) => sum + category.spentAmount, 0);
    const totalRemaining = totalBudget - totalSpent;
    const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const categoryBreakdown = budgetCategories.map(category => ({
      id: category.id,
      name: category.name,
      allocatedAmount: category.allocatedAmount,
      spentAmount: category.spentAmount,
      remainingAmount: category.allocatedAmount - category.spentAmount,
      spentPercentage: category.allocatedAmount > 0 ? (category.spentAmount / category.allocatedAmount) * 100 : 0,
      color: category.color,
    }));

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      spentPercentage,
      categoryBreakdown,
    };
  }, [budgetCategories]);

  // Memoized user total budget calculation
  const userTotalBudget = useMemo(() => {
    return budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0);
  }, [budgetCategories]);

  // Optimized budget categories fetching with pagination
  useEffect(() => {
    if (!user) return;

    const q = query(
      getUserCollectionRef('budgetCategories', user.uid),
      orderBy('orderIndex', 'asc'),
      limit(50) // Limit for better performance
    );

    const unsubscribeCategories = onSnapshot(q, (snapshot) => {
      const categories: BudgetCategory[] = snapshot.docs.map(transformCategoryData);

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

  // Optimized user max budget fetching
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.maxBudget) {
          setUserMaxBudget(userData.maxBudget);
        } else {
          setUserMaxBudget(null);
        }
      } else {
        setUserMaxBudget(null);
      }
    }, (error) => {
      console.error('Error fetching user budget:', error);
      setUserMaxBudget(null);
    });

    return () => unsubscribeUser();
  }, [user]);

  // Optimized budget items fetching with pagination
  useEffect(() => {
    if (!user) return;

    const q = query(
      getUserCollectionRef('budgetItems', user.uid),
      orderBy('createdAt', 'desc'),
      limit(200) // Limit initial load for better performance
    );

    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      const items: BudgetItem[] = snapshot.docs.map(transformBudgetItemData);
      setBudgetItems(items);
    }, (error) => {
      console.error('Error fetching budget items:', error);
      setBudgetItems([]);
    });

    return () => unsubscribeItems();
  }, [user]);

  // Memoized create default categories function
  const createDefaultCategories = useCallback(async () => {
    if (!user) return;

    try {
      const batch = writeBatch(db);
      
      DEFAULT_CATEGORIES.forEach((category, index) => {
        const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid));
        batch.set(categoryRef, {
          userId: user.uid,
          name: category.name,
          allocatedAmount: category.allocatedAmount,
          spentAmount: 0,
          orderIndex: index,
          createdAt: new Date(),
          color: category.color,
        });
      });

      await batch.commit();
      showSuccessToast('Default budget categories created!');
    } catch (error) {
      console.error('Error creating default categories:', error);
      showErrorToast('Failed to create default categories');
    }
  }, [user, showSuccessToast, showErrorToast]);

  // Memoized update user max budget function
  const updateUserMaxBudget = useCallback(async (newMaxBudget: number) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        maxBudget: newMaxBudget,
        updatedAt: new Date(),
      });

      setUserMaxBudget(newMaxBudget);
      showSuccessToast('Budget updated successfully!');
    } catch (error) {
      console.error('Error updating user max budget:', error);
      showErrorToast('Failed to update budget');
    }
  }, [user, showSuccessToast, showErrorToast]);

  // Memoized update budget categories from max budget function
  const updateBudgetCategoriesFromMaxBudget = useCallback(async (newMaxBudget: number) => {
    if (!user) return;

    try {
      const batch = writeBatch(db);
      const totalCategories = budgetCategories.length;
      const amountPerCategory = newMaxBudget / totalCategories;

      budgetCategories.forEach(category => {
        const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid), category.id);
        batch.update(categoryRef, {
          allocatedAmount: amountPerCategory,
          updatedAt: new Date(),
        });
      });

      await batch.commit();
      showSuccessToast('Budget categories updated!');
    } catch (error) {
      console.error('Error updating budget categories:', error);
      showErrorToast('Failed to update budget categories');
    }
  }, [user, budgetCategories, showSuccessToast, showErrorToast]);

  // Memoized category management functions
  const handleAddCategory = useCallback(async (name: string, allocatedAmount: number = 0) => {
    if (!user) return;

    try {
      const newCategory = {
        userId: user.uid,
        name: name.trim(),
        allocatedAmount,
        spentAmount: 0,
        orderIndex: budgetCategories.length,
        createdAt: new Date(),
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // Random color
      };

      await addDoc(getUserCollectionRef('budgetCategories', user.uid), newCategory);
      showSuccessToast(`Category "${name}" added!`);
    } catch (error) {
      console.error('Error adding category:', error);
      showErrorToast('Failed to add category');
    }
  }, [user, budgetCategories.length, showSuccessToast, showErrorToast]);

  const handleEditCategory = useCallback(async (categoryId: string, updates: Partial<BudgetCategory>) => {
    if (!user) return;

    try {
      const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid), categoryId);
      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: new Date(),
      });

      showSuccessToast('Category updated successfully!');
    } catch (error) {
      console.error('Error editing category:', error);
      showErrorToast('Failed to update category');
    }
  }, [user, showSuccessToast, showErrorToast]);

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    if (!user) return;

    try {
      // Delete the category
      await deleteDoc(doc(getUserCollectionRef('budgetCategories', user.uid), categoryId));
      
      // Delete all budget items in this category
      const itemsInCategory = budgetItems.filter(item => item.categoryId === categoryId);
      if (itemsInCategory.length > 0) {
        const batch = writeBatch(db);
        itemsInCategory.forEach(item => {
          const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), item.id);
          batch.delete(itemRef);
        });
        await batch.commit();
      }

      showSuccessToast('Category deleted successfully!');
    } catch (error) {
      console.error('Error deleting category:', error);
      showErrorToast('Failed to delete category');
    }
  }, [user, budgetItems, showSuccessToast, showErrorToast]);

  // Memoized budget item management functions
  const handleAddBudgetItem = useCallback(async (categoryId: string, itemData: Partial<BudgetItem>) => {
    if (!user) return;

    try {
      const newItem = {
        categoryId,
        userId: user.uid,
        name: itemData.name || '',
        notes: itemData.notes || '',
        amount: itemData.amount || 0,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        vendorId: itemData.vendorId || null,
        vendorName: itemData.vendorName || null,
        vendorPlaceId: itemData.vendorPlaceId || null,
        assignedTo: itemData.assignedTo || null,
        assignedBy: itemData.assignedBy || null,
        assignedAt: itemData.assignedAt || null,
        notificationRead: false,
      };

      const docRef = await addDoc(getUserCollectionRef('budgetItems', user.uid), newItem);
      showSuccessToast('Budget item added successfully!');
      return docRef.id;
    } catch (error) {
      console.error('Error adding budget item:', error);
      showErrorToast('Failed to add budget item');
      throw error;
    }
  }, [user, showSuccessToast, showErrorToast]);

  const handleUpdateBudgetItem = useCallback(async (itemId: string, updates: Partial<BudgetItem>) => {
    if (!user) return;

    try {
      const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: new Date(),
      });

      showSuccessToast('Budget item updated successfully!');
    } catch (error) {
      console.error('Error updating budget item:', error);
      showErrorToast('Failed to update budget item');
    }
  }, [user, showSuccessToast, showErrorToast]);

  const handleDeleteBudgetItem = useCallback(async (itemId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(getUserCollectionRef('budgetItems', user.uid), itemId));
      showSuccessToast('Budget item deleted successfully!');
    } catch (error) {
      console.error('Error deleting budget item:', error);
      showErrorToast('Failed to delete budget item');
    }
  }, [user, showSuccessToast, showErrorToast]);

  const handleEditBudgetItem = useCallback((item: BudgetItem) => {
    setSelectedBudgetItem(item);
    setShowBudgetItemModal(true);
  }, []);

  const handleLinkVendor = useCallback(async (itemId: string, vendorData: { vendorId: string; vendorName: string; vendorPlaceId: string }) => {
    if (!user) return;

    try {
      const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), itemId);
      await updateDoc(itemRef, {
        vendorId: vendorData.vendorId,
        vendorName: vendorData.vendorName,
        vendorPlaceId: vendorData.vendorPlaceId,
        updatedAt: new Date(),
      });

      showSuccessToast('Vendor linked successfully!');
    } catch (error) {
      console.error('Error linking vendor:', error);
      showErrorToast('Failed to link vendor');
    }
  }, [user, showSuccessToast, showErrorToast]);

  // Memoized AI generation functions
  const handleGenerateBudget = useCallback(async (description: string, totalBudget: number) => {
    if (!user) return;

    try {
      const response = await fetch('/api/generate-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, totalBudget, userId: user.uid }),
      });

      if (!response.ok) throw new Error('Failed to generate budget');

      const aiBudget = await response.json();
      await createBudgetFromAI(aiBudget);
      showSuccessToast('AI budget generated successfully!');
    } catch (error) {
      console.error('Error generating budget:', error);
      showErrorToast('Failed to generate budget');
    }
  }, [user, showSuccessToast, showErrorToast]);

  const handleGenerateTodoList = useCallback(async (description: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/generate-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, userId: user.uid }),
      });

      if (!response.ok) throw new Error('Failed to generate todo list');

      const aiTodoList = await response.json();
      await createTodoListFromAI(aiTodoList);
      showSuccessToast('AI todo list generated successfully!');
    } catch (error) {
      console.error('Error generating todo list:', error);
      showErrorToast('Failed to generate todo list');
    }
  }, [user, showSuccessToast, showErrorToast]);

  const handleGenerateIntegratedPlan = useCallback(async (description: string, totalBudget: number) => {
    if (!user) return;

    try {
      const response = await fetch('/api/generate-integrated-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, totalBudget, userId: user.uid }),
      });

      if (!response.ok) throw new Error('Failed to generate integrated plan');

      const integratedPlan = await response.json();
      await createBudgetFromAI(integratedPlan.budget);
      await createTodoListFromAI(integratedPlan.todoList);
      showSuccessToast('Integrated plan generated successfully!');
    } catch (error) {
      console.error('Error generating integrated plan:', error);
      showErrorToast('Failed to generate integrated plan');
    }
  }, [user, showSuccessToast, showErrorToast]);

  // Memoized AI result processing functions
  const createBudgetFromAI = useCallback(async (aiBudget: AIGeneratedBudget) => {
    if (!user) return;

    try {
      const batch = writeBatch(db);

      // Create categories from AI budget
      aiBudget.categories.forEach((category, index) => {
        const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid));
        batch.set(categoryRef, {
          userId: user.uid,
          name: category.name,
          allocatedAmount: category.allocatedAmount,
          spentAmount: 0,
          orderIndex: index,
          createdAt: new Date(),
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error creating budget from AI:', error);
      throw error;
    }
  }, [user]);

  const createTodoListFromAI = useCallback(async (aiTodoList: AIGeneratedTodoList) => {
    if (!user) return;

    try {
      const batch = writeBatch(db);

      // Create todo items from AI list
      aiTodoList.tasks.forEach((item, index) => {
        const itemRef = doc(getUserCollectionRef('todoItems', user.uid));
        batch.set(itemRef, {
          userId: user.uid,
          listId: 'ai-generated',
                     name: item.name,
           description: item.note,
          isCompleted: false,
          orderIndex: index,
          createdAt: new Date(),
          category: item.category,
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error creating todo list from AI:', error);
      throw error;
    }
  }, [user]);

  // Memoized assignment function
  const handleAssignBudgetItem = useCallback(async (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[], itemId?: string) => {
    if (!user) return;

    try {
      const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), itemId);
      const updateData: any = {
        assignedTo: assigneeIds.length > 0 ? assigneeIds : null,
        assignedBy: assigneeIds.length > 0 ? user.uid : null,
        assignedAt: assigneeIds.length > 0 ? new Date() : null,
        notificationRead: false,
        updatedAt: new Date(),
      };
      
      await updateDoc(itemRef, updateData);
      
      // Send notifications for assignments to others (not self)
      if (assigneeIds.length > 0) {
        const currentUserName = user.displayName || user.email || 'You';
        
        for (const assigneeId of assigneeIds) {
          // Don't send notification if assigning to self
          if (assigneeId === user.uid) continue;
          
          // Send notification for partner or planner assignments
          if (assigneeId === 'partner' || assigneeId === 'planner') {
            try {
              await fetch('/api/notifications/todo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.uid,
                  todoId: itemId,
                  todoName: budgetItems.find(item => item.id === itemId)?.name || 'Budget Item',
                  action: 'assigned',
                  assignedBy: currentUserName,
                  assignedTo: assigneeId
                })
              });
            } catch (error) {
              console.error('Failed to send budget item assignment notification:', error);
            }
          }
        }
        
        const namesText = assigneeNames.join(', ');
        showSuccessToast(`Assigned to ${namesText}`);
      } else {
        showSuccessToast('Assignment removed');
      }
    } catch (error) {
      console.error('Error assigning budget item:', error);
      showErrorToast('Failed to assign budget item');
    }
  }, [user, budgetItems, showSuccessToast, showErrorToast]);

  return {
    // State
    budgetCategories,
    budgetItems,
    budgetStats,
    userMaxBudget,
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
    handleAssignBudgetItem,
    handleGenerateBudget,
    handleGenerateTodoList,
    handleGenerateIntegratedPlan,
    updateUserMaxBudget,
    updateBudgetCategoriesFromMaxBudget,
  };
} 