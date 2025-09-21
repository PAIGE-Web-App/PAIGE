import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useCustomToast } from './useCustomToast';
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
} from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import type { BudgetCategory } from '@/types/budget';

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
  { name: 'Miscellaneous', allocatedAmount: 0, color: '#696969' },
];

export function useBudgetCategories() {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);

  // Optimized budget categories listener with proper cleanup
  useEffect(() => {
    if (!user?.uid) return;

    const categoriesRef = getUserCollectionRef(user.uid, 'budgetCategories');
    const q = query(categoriesRef, orderBy('createdAt', 'desc'), limit(50)); // Limit for better performance

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categories = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as BudgetCategory;
      });

      setBudgetCategories(categories);
    }, (error) => {
      console.error('Error fetching budget categories:', error);
      showErrorToast('Failed to load budget categories');
    });

    return unsubscribe;
  }, [user?.uid, showErrorToast]);

  const handleAddCategory = useCallback(async (name: string, allocatedAmount: number = 0) => {
    if (!user?.uid) return;

    try {
      const categoriesRef = getUserCollectionRef(user.uid, 'budgetCategories');
      await addDoc(categoriesRef, {
        name,
        allocatedAmount,
        spentAmount: 0,
        color: DEFAULT_CATEGORIES.find(cat => cat.name === name)?.color || '#696969',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      showSuccessToast('Category added successfully!');
    } catch (error: any) {
      console.error('Error adding category:', error);
      showErrorToast(`Failed to add category: ${error.message}`);
    }
  }, [user?.uid, showSuccessToast, showErrorToast]);

  const handleEditCategory = useCallback(async (categoryId: string, updates: Partial<BudgetCategory>) => {
    if (!user?.uid) return;

    try {
      const categoryRef = doc(getUserCollectionRef(user.uid, 'budgetCategories'), categoryId);
      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: new Date(),
      });

      showSuccessToast('Category updated successfully!');
    } catch (error: any) {
      console.error('Error updating category:', error);
      showErrorToast(`Failed to update category: ${error.message}`);
    }
  }, [user?.uid, showSuccessToast, showErrorToast]);

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    if (!user?.uid) return;

    try {
      const categoryRef = doc(getUserCollectionRef(user.uid, 'budgetCategories'), categoryId);
      await deleteDoc(categoryRef);

      showSuccessToast('Category deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting category:', error);
      showErrorToast(`Failed to delete category: ${error.message}`);
    }
  }, [user?.uid, showSuccessToast, showErrorToast]);

  const handleDeleteAllCategories = useCallback(async () => {
    if (!user?.uid || budgetCategories.length === 0) return;

    try {
      const batch = writeBatch(getUserCollectionRef(user.uid, 'budgetCategories').firestore);
      
      budgetCategories.forEach(category => {
        const categoryRef = doc(getUserCollectionRef(user.uid, 'budgetCategories'), category.id);
        batch.delete(categoryRef);
      });

      await batch.commit();
      showSuccessToast('All categories deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting all categories:', error);
      showErrorToast(`Failed to delete all categories: ${error.message}`);
    }
  }, [user?.uid, budgetCategories, showSuccessToast, showErrorToast]);

  return {
    budgetCategories,
    handleAddCategory,
    handleEditCategory,
    handleDeleteCategory,
    handleDeleteAllCategories,
  };
}
