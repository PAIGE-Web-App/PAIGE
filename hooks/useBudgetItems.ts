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
} from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import type { BudgetItem } from '@/types/budget';

export function useBudgetItems() {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);

  // Optimized budget items listener with proper cleanup
  useEffect(() => {
    if (!user?.uid) return;

    const itemsRef = getUserCollectionRef(user.uid, 'budgetItems');
    const q = query(itemsRef, orderBy('createdAt', 'desc'), limit(100)); // Limit for better performance

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as BudgetItem;
      });

      setBudgetItems(items);
    }, (error) => {
      console.error('Error fetching budget items:', error);
      showErrorToast('Failed to load budget items');
    });

    return unsubscribe;
  }, [user?.uid, showErrorToast]);

  const handleAddBudgetItem = useCallback(async (categoryId: string, itemData: Partial<BudgetItem>) => {
    if (!user?.uid) return;

    try {
      const itemsRef = getUserCollectionRef(user.uid, 'budgetItems');
      await addDoc(itemsRef, {
        categoryId,
        name: itemData.name || 'New Item',
        amount: itemData.amount || 0,
        allocatedAmount: (itemData as any).allocatedAmount || 0,
        priority: (itemData as any).priority || 'Medium',
        notes: (itemData as any).notes || '',
        vendorId: (itemData as any).vendorId || null,
        vendorName: (itemData as any).vendorName || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      showSuccessToast('Budget item added successfully!');
    } catch (error: any) {
      console.error('Error adding budget item:', error);
      showErrorToast(`Failed to add budget item: ${error.message}`);
    }
  }, [user?.uid, showSuccessToast, showErrorToast]);

  const handleUpdateBudgetItem = useCallback(async (itemId: string, updates: Partial<BudgetItem>) => {
    if (!user?.uid) return;

    try {
      const itemRef = doc(getUserCollectionRef(user.uid, 'budgetItems'), itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: new Date(),
      });

      showSuccessToast('Budget item updated successfully!');
    } catch (error: any) {
      console.error('Error updating budget item:', error);
      showErrorToast(`Failed to update budget item: ${error.message}`);
    }
  }, [user?.uid, showSuccessToast, showErrorToast]);

  const handleDeleteBudgetItem = useCallback(async (itemId: string) => {
    if (!user?.uid) return;

    try {
      const itemRef = doc(getUserCollectionRef(user.uid, 'budgetItems'), itemId);
      await deleteDoc(itemRef);

      showSuccessToast('Budget item deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting budget item:', error);
      showErrorToast(`Failed to delete budget item: ${error.message}`);
    }
  }, [user?.uid, showSuccessToast, showErrorToast]);

  const handleLinkVendor = useCallback(async (itemId: string, vendorData: any) => {
    if (!user?.uid) return;

    try {
      const itemRef = doc(getUserCollectionRef(user.uid, 'budgetItems'), itemId);
      await updateDoc(itemRef, {
        vendorId: vendorData.id,
        vendorName: vendorData.name,
        updatedAt: new Date(),
      });

      showSuccessToast('Vendor linked successfully!');
    } catch (error: any) {
      console.error('Error linking vendor:', error);
      showErrorToast(`Failed to link vendor: ${error.message}`);
    }
  }, [user?.uid, showSuccessToast, showErrorToast]);

  return {
    budgetItems,
    handleAddBudgetItem,
    handleUpdateBudgetItem,
    handleDeleteBudgetItem,
    handleLinkVendor,
  };
}
