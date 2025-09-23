import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useCustomToast } from './useCustomToast';
import { useGlobalCompletionToasts } from './useGlobalCompletionToasts';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserCollectionRef } from '@/lib/firebase';
import type { BudgetCategory, BudgetItem } from '@/types/budget';

interface ConsolidatedBudgetData {
  budgetCategories: BudgetCategory[];
  budgetItems: BudgetItem[];
  userMaxBudget: number | null;
  loading: boolean;
  error: string | null;
}

interface BudgetStats {
  totalSpent: number;
  totalRemaining: number;
  budgetUtilization: number;
  isOverBudget: boolean;
}

export function useBudgetConsolidated() {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();
  
  // Consolidated state
  const [budgetData, setBudgetData] = useState<ConsolidatedBudgetData>({
    budgetCategories: [],
    budgetItems: [],
    userMaxBudget: null,
    loading: true,
    error: null
  });

  // Single consolidated listener for all budget data
  useEffect(() => {
    let isSubscribed = true;
    
    if (!user?.uid) {
      setBudgetData({
        budgetCategories: [],
        budgetItems: [],
        userMaxBudget: null,
        loading: false,
        error: null
      });
      return;
    }

    setBudgetData(prev => ({ ...prev, loading: true, error: null }));

    // Single listener that fetches all budget data at once
    const fetchAllBudgetData = async () => {
      try {
        // Fetch user max budget
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const userMaxBudget = userDoc.exists() ? userDoc.data()?.maxBudget || null : null;

        // Fetch budget categories
        const categoriesQuery = query(
          getUserCollectionRef('budgetCategories', user.uid),
          orderBy('orderIndex', 'asc'),
          limit(50)
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const budgetCategories: BudgetCategory[] = categoriesSnapshot.docs.map(doc => {
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

        // Fetch budget items
        const itemsQuery = query(
          getUserCollectionRef('budgetItems', user.uid),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const itemsSnapshot = await getDocs(itemsQuery);
        const budgetItems: BudgetItem[] = itemsSnapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as BudgetItem;
        });

        if (isSubscribed) {
          setBudgetData({
            budgetCategories,
            budgetItems,
            userMaxBudget,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setBudgetData(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to load budget data'
          }));
        }
      }
    };

    // Initial fetch
    fetchAllBudgetData();

    // Set up real-time listeners only for critical updates
    const categoriesQuery = query(
      getUserCollectionRef('budgetCategories', user.uid),
      orderBy('orderIndex', 'asc'),
      limit(50)
    );

    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      if (!isSubscribed) return;
      
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

      setBudgetData(prev => ({ ...prev, budgetCategories: categories }));
    }, (error) => {
      if (isSubscribed) {
        setBudgetData(prev => ({ ...prev, error: 'Failed to load budget categories' }));
      }
    });

    const itemsQuery = query(
      getUserCollectionRef('budgetItems', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
      if (!isSubscribed) return;
      
      const items: BudgetItem[] = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as BudgetItem;
      });

      setBudgetData(prev => ({ ...prev, budgetItems: items }));
    }, (error) => {
      if (isSubscribed) {
        setBudgetData(prev => ({ ...prev, error: 'Failed to load budget items' }));
      }
    });

    // User budget listener (less frequent updates)
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
      if (!isSubscribed) return;
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userMaxBudget = userData.maxBudget || null;
        setBudgetData(prev => ({ ...prev, userMaxBudget }));
      } else {
        setBudgetData(prev => ({ ...prev, userMaxBudget: null }));
      }
    }, (error) => {
      if (isSubscribed) {
        setBudgetData(prev => ({ ...prev, error: 'Failed to load user budget' }));
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribeCategories();
      unsubscribeItems();
      unsubscribeUser();
    };
  }, [user?.uid]);

  // Memoized budget statistics
  const budgetStats = useMemo((): BudgetStats => {
    const { budgetCategories, budgetItems, userMaxBudget } = budgetData;
    
    // Calculate total spent from budget items (only paid items)
    const totalSpent = budgetItems
      .filter(item => item.isPaid)
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    // Calculate total allocated from categories
    const totalAllocated = budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0);

    // Calculate remaining budget
    const totalRemaining = (userMaxBudget || 0) - totalSpent;

    // Calculate utilization percentage
    const budgetUtilization = userMaxBudget ? (totalSpent / userMaxBudget) * 100 : 0;

    return {
      totalSpent,
      totalRemaining,
      budgetUtilization,
      isOverBudget: totalSpent > (userMaxBudget || 0)
    };
  }, [budgetData]);

  // Memoized projected spend calculation
  const projectedSpend = useMemo(() => {
    return budgetData.budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0);
  }, [budgetData.budgetCategories]);

  // Memoized budget flexibility calculation
  const budgetFlexibility = useMemo(() => {
    return (budgetData.userMaxBudget || 0) - projectedSpend;
  }, [budgetData.userMaxBudget, projectedSpend]);

  // Optimized update functions
  const updateUserMaxBudget = useCallback(async (newMaxBudget: number) => {
    if (!user?.uid) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        maxBudget: newMaxBudget,
        updatedAt: new Date(),
      });

      showSuccessToast('Max budget updated successfully!');
    } catch (error) {
      showErrorToast('Failed to update max budget.');
    }
  }, [user?.uid, showSuccessToast, showErrorToast]);

  const addCategory = useCallback(async (name: string, allocatedAmount: number = 0, showToast: boolean = true, showCompletion: boolean = true, color?: string): Promise<string | null> => {
    if (!user?.uid) return null;

    try {
      const categoryRef = await addDoc(getUserCollectionRef('budgetCategories', user.uid), {
        userId: user.uid,
        name,
        allocatedAmount,
        spentAmount: 0,
        orderIndex: budgetData.budgetCategories.length,
        createdAt: new Date(),
        color: color || '#A85C36',
      });

      if (showToast) {
        showSuccessToast(`Category "${name}" added!`);
      }

      if (showCompletion && budgetData.budgetCategories.length === 0) {
        showCompletionToast('budget');
      }

      return categoryRef.id;
    } catch (error: any) {
      showErrorToast(`Failed to add category: ${error.message}`);
      return null;
    }
  }, [user?.uid, budgetData.budgetCategories.length, showSuccessToast, showErrorToast, showCompletionToast]);

  const addBudgetItem = useCallback(async (categoryId: string, itemData: Partial<BudgetItem>, showToast: boolean = true) => {
    if (!user?.uid) return;

    try {
      const budgetItemData = {
        userId: user.uid,
        categoryId,
        name: itemData.name || '',
        amount: itemData.amount || 0,
        notes: itemData.notes || '',
        vendorName: itemData.vendorName || '',
        vendorPlaceId: itemData.vendorPlaceId || '',
        dueDate: itemData.dueDate || null,
        isPaid: itemData.isPaid || false,
        assignedTo: itemData.assignedTo || [],
        assignedBy: itemData.assignedBy || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(getUserCollectionRef('budgetItems', user.uid), budgetItemData);

      if (showToast) {
        showSuccessToast(`Budget item "${itemData.name}" added!`);
      }
    } catch (error: any) {
      showErrorToast(`Failed to add budget item: ${error.message}`);
    }
  }, [user?.uid, showSuccessToast, showErrorToast]);

  return {
    // Data
    budgetCategories: budgetData.budgetCategories,
    budgetItems: budgetData.budgetItems,
    userMaxBudget: budgetData.userMaxBudget,
    loading: budgetData.loading,
    error: budgetData.error,
    
    // Computed values
    budgetStats,
    projectedSpend,
    budgetFlexibility,
    
    // Actions
    updateUserMaxBudget,
    addCategory,
    addBudgetItem,
  };
}
