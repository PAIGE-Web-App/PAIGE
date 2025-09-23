import { useState, useEffect, useMemo } from 'react';
import { useCustomToast } from './useCustomToast';
import { useGlobalCompletionToasts } from './useGlobalCompletionToasts';
import { useAuth } from './useAuth';
import { useCredits } from '@/contexts/CreditContext';
import { getCategoryColor } from '@/utils/categoryIcons';

// Helper function to generate fallback due dates
function generateFallbackDueDate(itemName: string, categoryName: string): Date {
  const today = new Date();
  const dueDate = new Date(today);
  
  // Generate due dates based on category and item type
  const itemLower = itemName.toLowerCase();
  const categoryLower = categoryName.toLowerCase();
  
  if (categoryLower.includes('venue') || categoryLower.includes('catering')) {
    // Venue and catering typically need early booking
    dueDate.setMonth(dueDate.getMonth() + 6); // 6 months out
  } else if (categoryLower.includes('photography') || categoryLower.includes('videography')) {
    // Photography/video needs moderate lead time
    dueDate.setMonth(dueDate.getMonth() + 4); // 4 months out
  } else if (categoryLower.includes('flower') || categoryLower.includes('decor')) {
    // Flowers and decorations need moderate lead time
    dueDate.setMonth(dueDate.getMonth() + 3); // 3 months out
  } else if (categoryLower.includes('music') || categoryLower.includes('entertainment')) {
    // Entertainment needs moderate lead time
    dueDate.setMonth(dueDate.getMonth() + 3); // 3 months out
  } else if (categoryLower.includes('attire') || categoryLower.includes('beauty')) {
    // Attire needs moderate lead time
    dueDate.setMonth(dueDate.getMonth() + 2); // 2 months out
  } else {
    // Default to 2 months out for other items
    dueDate.setMonth(dueDate.getMonth() + 2);
  }
  
  return dueDate;
}

// Helper function to safely parse dates
function parseValidDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Ensure date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    
    if (date < today) {
      return null;
    }
    
    return date;
  } catch (error) {
    return null;
  }
}
import { useRAGTodoGeneration } from './useRAGTodoGeneration';
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
  getDocs,
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

export function useBudget() {
  const { user } = useAuth();
  const { refreshCredits } = useCredits();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();
  const { generateTodos } = useRAGTodoGeneration();

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
  const [isCreatingBudget, setIsCreatingBudget] = useState(false);
  const [budgetCreationProgress, setBudgetCreationProgress] = useState<{
    current: number;
    total: number;
    currentItem: string;
  } | null>(null);

  // Optimized budget categories listener with proper cleanup
  useEffect(() => {
    let isSubscribed = true;
    
    if (user) {
      const q = query(
        getUserCollectionRef('budgetCategories', user.uid),
        orderBy('orderIndex', 'asc'),
        limit(50) // Limit for better performance
      );

      const unsubscribeCategories = onSnapshot(q, (snapshot) => {
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

        // If no categories exist, just set empty array (don't auto-create)
        setBudgetCategories(categories);
      }, (error) => {
        if (isSubscribed) {
          setBudgetCategories([]);
        }
      });

      return () => {
        isSubscribed = false;
        unsubscribeCategories();
      };
    }
  }, [user]);

  // Optimized user budget listener with proper cleanup
  useEffect(() => {
    let isSubscribed = true;
    
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
        if (!isSubscribed) return;
        
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
        if (isSubscribed) {
          setUserMaxBudget(null);
        }
      });

      return () => {
        isSubscribed = false;
        unsubscribeUser();
      };
    }
  }, [user]);

  // Optimized budget items listener with proper cleanup
  useEffect(() => {
    let isSubscribed = true;
    
    if (user) {
      const q = query(
        getUserCollectionRef('budgetItems', user.uid),
        orderBy('createdAt', 'desc'),
        limit(100) // Limit for better performance
      );

      const unsubscribeItems = onSnapshot(q, (snapshot) => {
        if (!isSubscribed) return;
        
        const items: BudgetItem[] = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          
          // Optimize date processing
          const processDate = (dateField: any): Date | undefined => {
            if (!dateField) return undefined;
            if (typeof dateField.toDate === 'function') return dateField.toDate();
            if (dateField instanceof Date) return dateField;
            return undefined;
          };
          
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
            // Payment tracking fields
            dueDate: processDate(data.dueDate),
            isPaid: data.isPaid || false,
            amountSpent: data.amountSpent,
            createdAt: processDate(data.createdAt) || new Date(),
            updatedAt: processDate(data.updatedAt) || new Date(),
            // Assignment fields
            assignedTo: data.assignedTo || null,
            assignedBy: data.assignedBy || null,
            assignedAt: processDate(data.assignedAt),
            notificationRead: data.notificationRead || false
          };
        });
        
        if (isSubscribed) {
          setBudgetItems(items);
        }
      }, (error) => {
        if (isSubscribed) {
          setBudgetItems([]);
        }
      });

      return () => {
        isSubscribed = false;
        unsubscribeItems();
      };
    }
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
      // Silent fail - default categories creation is not critical
    }
  };

  // Function to update user's budget range
  const updateUserMaxBudget = async (newMaxBudget: number) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        maxBudget: newMaxBudget,
        updatedAt: new Date(),
      });

      // The onSnapshot listener will automatically update the local state
      showSuccessToast('Max budget updated successfully!');
    } catch (error) {
      showErrorToast('Failed to update max budget.');
    }
  };

  // Function to update budget categories when max budget changes
  const updateBudgetCategoriesFromMaxBudget = async (newMaxBudget: number) => {
    if (!user) return;

    try {
      const totalBudget = newMaxBudget;
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
      showErrorToast('Failed to update budget categories.');
    }
  };

  // Calculate budget statistics
  const budgetStats = useMemo(() => {
    // Only count paid items for total spent calculation
    const totalSpent = budgetItems
      .filter(item => item.isPaid && item.amountSpent !== undefined)
      .reduce((sum, item) => sum + (item.amountSpent || 0), 0);
    
    const totalAllocated = budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0);
    const totalRemaining = (userMaxBudget || 0) - totalSpent;
    const spentPercentage = (userMaxBudget || 0) > 0 ? (totalSpent / (userMaxBudget || 1)) * 100 : 0;

    const categoryBreakdown = budgetCategories.map(category => {
      const categoryItems = budgetItems.filter(item => item.categoryId === category.id);
      // Only count paid items for category spent calculation
      const categorySpent = categoryItems
        .filter(item => item.isPaid && item.amountSpent !== undefined)
        .reduce((sum, item) => sum + (item.amountSpent || 0), 0);
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
  }, [budgetCategories, budgetItems, userMaxBudget]);

  // Add new category
  const handleAddCategory = async (name: string, allocatedAmount: number = 0, showToast: boolean = true, showCompletion: boolean = true, color?: string): Promise<string | null> => {
    if (!user) return null;

    if (!name.trim()) {
      showErrorToast('Category name cannot be empty.');
      return null;
    }

    try {
      const maxOrderIndex = budgetCategories.length > 0 ? Math.max(...budgetCategories.map(cat => cat.orderIndex)) : -1;
      const categoryRef = await addDoc(getUserCollectionRef('budgetCategories', user.uid), {
        name: name.trim(),
        allocatedAmount,
        spentAmount: 0,
        orderIndex: maxOrderIndex + 1,
        userId: user.uid,
        createdAt: new Date(),
        color: color || '#A85C36', // Use provided color or default
      });

      // Update user's budget range to reflect the new total
      if (allocatedAmount > 0) {
        const newTotalBudget = budgetCategories.reduce((sum, cat) => sum + cat.allocatedAmount, 0) + allocatedAmount;
        const newBudgetRange = {
          min: Math.round(newTotalBudget * 0.8), // 20% buffer below
          max: Math.round(newTotalBudget * 1.2), // 20% buffer above
        };
        
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          budgetRange: newBudgetRange,
          updatedAt: new Date(),
        });
      }

      if (showToast) {
        showSuccessToast(`Category "${name}" added!`);
      }
      
      // Show completion toast for creating first budget category (only when not part of batch)
      if (showCompletion && budgetCategories.length === 0) {
        showCompletionToast('budget');
      }

      return categoryRef.id;
    } catch (error: any) {
      showErrorToast(`Failed to add category: ${error.message}`);
      return null;
    }
  };

  // Add multiple categories with consolidated toast
  const handleAddMultipleCategories = async (categories: Array<{name: string; amount: number; color?: string; items?: Array<{name: string; amount: number; notes?: string; dueDate?: Date}>}>) => {
    if (!user) return;

    try {
      const initialCategoryCount = budgetCategories.length;
      let totalAmount = 0;
      let totalItemsAdded = 0;
      
      // Add all categories without individual toasts or completion toasts
      for (const category of categories) {
        const categoryId = await handleAddCategory(category.name, category.amount, false, false, category.color);
        totalAmount += category.amount;
        
        // Add budget items for this category if provided
        if (categoryId && category.items && category.items.length > 0) {
          for (const item of category.items) {
            await handleAddBudgetItem(categoryId, {
              name: item.name,
              amount: item.amount,
              notes: item.notes || '',
              dueDate: item.dueDate,
            }, false); // Don't show individual toasts
            totalItemsAdded++;
          }
        }
      }

      // Show single consolidated success toast
      const categoryCount = categories.length;
      const categoryText = categoryCount === 1 ? 'category' : 'categories';
      
      if (totalItemsAdded > 0) {
        const itemText = totalItemsAdded === 1 ? 'item' : 'items';
        showSuccessToast(`${categoryCount} ${categoryText} and ${totalItemsAdded} ${itemText} added successfully!`);
      } else {
        showSuccessToast(`${categoryCount} ${categoryText} added successfully!`);
      }
      
      // Show completion toast for creating first budget categories (only once, based on initial count)
      if (initialCategoryCount === 0) {
        showCompletionToast('budget');
      }
    } catch (error: any) {
      showErrorToast(`Failed to add categories: ${error.message}`);
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

      

      // If allocated amount changed, update the user's budget range
      if (updates.allocatedAmount !== undefined) {
        // Calculate new total budget from all categories
        const currentCategory = budgetCategories.find(cat => cat.id === categoryId);
        const otherCategoriesTotal = budgetCategories
          .filter(cat => cat.id !== categoryId)
          .reduce((sum, cat) => sum + cat.allocatedAmount, 0);
        
        const newTotalBudget = otherCategoriesTotal + updates.allocatedAmount;
        

        
        // Update user's budget range to reflect the new total
        const newBudgetRange = {
          min: Math.round(newTotalBudget * 0.8), // 20% buffer below
          max: Math.round(newTotalBudget * 1.2), // 20% buffer above
        };
        

        
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          budgetRange: newBudgetRange,
          updatedAt: new Date(),
        });
        

      }

      showSuccessToast('Category updated!');
    } catch (error: any) {
      showErrorToast(`Failed to update category: ${error.message}`);
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;

    try {
      // Get the category being deleted to calculate new total
      const categoryToDelete = budgetCategories.find(cat => cat.id === categoryId);
      
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

      // Update user's budget range to reflect the new total
      if (categoryToDelete && categoryToDelete.allocatedAmount > 0) {
        const newTotalBudget = budgetCategories
          .filter(cat => cat.id !== categoryId)
          .reduce((sum, cat) => sum + cat.allocatedAmount, 0);
        
        const newBudgetRange = {
          min: Math.round(newTotalBudget * 0.8), // 20% buffer below
          max: Math.round(newTotalBudget * 1.2), // 20% buffer above
        };
        
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          budgetRange: newBudgetRange,
          updatedAt: new Date(),
        });
      }

      showSuccessToast('Category deleted!');
    } catch (error: any) {
      showErrorToast(`Failed to delete category: ${error.message}`);
    }
  };

  // Delete all categories
  const handleDeleteAllCategories = async () => {
    if (!user) return;

    try {
      // Query all budget items to ensure we get everything (with reasonable limit)
      const itemsQuery = query(
        getUserCollectionRef('budgetItems', user.uid),
        limit(1000) // Reasonable limit for delete all operation
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      
      // Query all budget categories (with reasonable limit)
      const categoriesQuery = query(
        getUserCollectionRef('budgetCategories', user.uid),
        limit(100) // Reasonable limit for delete all operation
      );
      const categoriesSnapshot = await getDocs(categoriesQuery);

      // Delete all budget items first
      const batch = writeBatch(getUserCollectionRef('budgetItems', user.uid).firestore);
      
      itemsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all categories
      categoriesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Reset user's budget range
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        budgetRange: {
          min: 0,
          max: 0
        },
        updatedAt: new Date(),
      });

      showSuccessToast('All categories and items deleted!');
    } catch (error: any) {
      showErrorToast(`Failed to delete all categories: ${error.message}`);
    }
  };

  // Clear all budget data (emergency reset)
  const handleClearAllBudgetData = async () => {
    if (!user) return;

    try {
      // Query all budget items (with reasonable limit)
      const itemsQuery = query(
        getUserCollectionRef('budgetItems', user.uid),
        limit(1000) // Reasonable limit for clear all operation
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      
      // Query all budget categories (with reasonable limit)
      const categoriesQuery = query(
        getUserCollectionRef('budgetCategories', user.uid),
        limit(100) // Reasonable limit for clear all operation
      );
      const categoriesSnapshot = await getDocs(categoriesQuery);

      // Delete everything in batches
      const batch = writeBatch(getUserCollectionRef('budgetItems', user.uid).firestore);
      
      // Delete all budget items
      itemsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all categories
      categoriesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Reset user's budget range but keep max budget
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        budgetRange: {
          min: 0,
          max: 0
        },
        updatedAt: new Date(),
      });

      showSuccessToast('All budget data cleared!');
    } catch (error: any) {
      showErrorToast(`Failed to clear budget data: ${error.message}`);
    }
  };

  // Add budget item
  const handleAddBudgetItem = async (categoryId: string, itemData: Partial<BudgetItem>, showToast: boolean = true) => {
    if (!user) return;

    if (!itemData.name?.trim()) {
      showErrorToast('Item name cannot be empty.');
      return;
    }

    try {
      const budgetItemData: any = {
        categoryId,
        name: itemData.name.trim(),
        amount: itemData.amount || 0,
        notes: itemData.notes || '',
        isCustom: itemData.isCustom || false,
        isCompleted: false,
        userId: user.uid,
        // Payment tracking defaults
        isPaid: false, // Default to unpaid
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Only add vendor fields if they exist
      if (itemData.vendorId) budgetItemData.vendorId = itemData.vendorId;
      if (itemData.vendorName) budgetItemData.vendorName = itemData.vendorName;
      if (itemData.vendorPlaceId) budgetItemData.vendorPlaceId = itemData.vendorPlaceId;
      
      // Only add payment tracking fields if they exist
      if (itemData.dueDate) budgetItemData.dueDate = itemData.dueDate;
      if (itemData.amountSpent !== undefined) budgetItemData.amountSpent = itemData.amountSpent;

      await addDoc(getUserCollectionRef('budgetItems', user.uid), budgetItemData);

      if (showToast) {
        showSuccessToast(`Budget item "${itemData.name}" added!`);
      }
    } catch (error: any) {
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
      showErrorToast(`Failed to link vendor: ${error.message}`);
    }
  };

  // AI Integration Functions
  const handleGenerateBudget = async (description: string, totalBudget: number, aiBudget?: AIGeneratedBudget) => {
    // Prevent multiple simultaneous budget generations
    if (isCreatingBudget) {
      return;
    }

    try {
      let data: AIGeneratedBudget;
      
      if (aiBudget) {
        // Use the provided RAG response directly (no additional API call needed)
        data = aiBudget;
      } else {
        // This should not happen in the current flow since AI components provide aiBudget
        // But keep as fallback for any legacy usage
        throw new Error('AI budget data is required. Please use the AI Budget Assistant to generate budgets.');
      }
      
      // Create the budget from AI response
      await createBudgetFromAI(data);
      
      // Credits are already deducted by the API middleware, no need to refresh
      showSuccessToast('AI budget generated successfully!');
    } catch (error: any) {
      showErrorToast(`Failed to generate budget: ${error.message}`);
    }
  };

  const handleGenerateTodoList = async (description: string) => {
    try {
      // Use RAG system for todo generation
      const ragResponse = await generateTodos({
        description,
        weddingDate: new Date().toISOString(),
        todoType: 'comprehensive',
        focusCategories: budgetCategories.map(cat => cat.name),
        existingTodos: [],
        vendorData: []
      });

      if (ragResponse.success && ragResponse.todos) {
        // Transform RAG response to match expected format
        const transformedData: AIGeneratedTodoList = {
          name: ragResponse.todos.listName,
          tasks: ragResponse.todos.todos.map((task: any) => ({
            name: task.name,
            note: task.note || '',
            deadline: task.deadline || '',
            category: task.category || 'Planning'
          }))
        };
        
        // Create todo list from AI response
        await createTodoListFromAI(transformedData);
        
        showSuccessToast('AI todo list generated successfully!');
      } else {
        throw new Error('Failed to generate todo list');
      }
    } catch (error: any) {
      showErrorToast(`Failed to generate todo list: ${error.message}`);
    }
  };

  const handleGenerateIntegratedPlan = async (description: string, totalBudget: number) => {
    try {
      
      
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      let response;
      try {
        response = await fetch('/api/generate-integrated-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            description, 
            totalBudget, 
            weddingDate,
            userId: user?.uid
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to generate integrated plan: ${response.status} - ${errorText}`);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw error;
      }
      
      const data: IntegratedPlan = await response.json();
      
      
      // Create both budget and todo list from integrated plan
      await createBudgetFromAI(data.budget);
      await createTodoListFromAI(data.todoList);
      
      showSuccessToast('Integrated plan generated successfully!');
    } catch (error: any) {
      showErrorToast(`Failed to generate integrated plan: ${error.message}`);
    }
  };

  // Helper functions for AI integration
  const createBudgetFromAI = async (aiBudget: AIGeneratedBudget) => {
    if (!user) return;

    // Prevent multiple simultaneous budget creations
    if (isCreatingBudget) {
      return;
    }

    setIsCreatingBudget(true);
    
    // Calculate total items for progress tracking
    const totalItems = aiBudget.categories.reduce((sum, cat) => {
      return sum + (cat.items ? cat.items.length : 0);
    }, 0);
    let currentItem = 0;
    
    setBudgetCreationProgress({
      current: 0,
      total: totalItems,
      currentItem: 'Starting budget creation...'
    });

    // Validate that AI-generated budget doesn't exceed max budget (with 10% flexibility buffer)
    const totalAllocatedAmount = aiBudget.categories.reduce((sum, cat) => sum + (cat.allocatedAmount || 0), 0);
    const maxBudget = userMaxBudget || 0;
    const flexibilityBuffer = maxBudget * 0.1; // 10% buffer for realistic planning
    const maxAllowedBudget = maxBudget + flexibilityBuffer;
    
    if (maxBudget > 0 && totalAllocatedAmount > maxAllowedBudget) {
      const overageAmount = totalAllocatedAmount - maxAllowedBudget;
      const overagePercentage = Math.round((overageAmount / maxBudget) * 100);
      
      // Show warning and stop budget creation
      showErrorToast(
        `AI-generated budget exceeds your max budget by $${overageAmount.toLocaleString()} (${overagePercentage}% over). ` +
        `Total: $${totalAllocatedAmount.toLocaleString()} vs Max: $${maxBudget.toLocaleString()} (with 10% flexibility). ` +
        `Please adjust your budget or try generating with a different description.`
      );
      setIsCreatingBudget(false);
      return;
    }

    const batch = writeBatch(getUserCollectionRef('budgetCategories', user.uid).firestore);
    
    // Create categories and items from AI response
    for (const category of aiBudget.categories) {
      const categoryRef = doc(getUserCollectionRef('budgetCategories', user.uid));
      
      // Ensure all required fields have valid values
      const categoryData = {
        name: category.name || 'Untitled Category',
        allocatedAmount: category.allocatedAmount || 0, // Ensure this is never undefined
        spentAmount: 0,
        orderIndex: budgetCategories.length,
        userId: user.uid,
        createdAt: new Date(),
        color: category.color || '#696969', // Add the color from the transformed budget with fallback
      };
      
      // Validate data before saving
      if (categoryData.allocatedAmount === undefined || categoryData.allocatedAmount === null) {
        categoryData.allocatedAmount = 0;
      }
      
      batch.set(categoryRef, categoryData);

      // Add items for this category (without amounts - amounts represent spent, not allocated)
      for (const item of category.items) {
        currentItem++;
        
        setBudgetCreationProgress({
          current: currentItem,
          total: totalItems,
          currentItem: `Creating "${item.name}" in ${category.name}...`
        });
        
        // Validate that item amount doesn't exceed category allocated amount
        const itemAmount = item.amount || 0;
        const categoryAllocatedAmount = categoryData.allocatedAmount;
        
        if (itemAmount > categoryAllocatedAmount) {
          // Log warning but continue - this shouldn't happen with improved AI prompts
          console.warn(`Item "${item.name}" amount ($${itemAmount}) exceeds category "${category.name}" allocated amount ($${categoryAllocatedAmount}). Adjusting item amount.`);
        }
        
        // Cap item amount to category allocated amount to prevent unrealistic allocations
        const adjustedItemAmount = Math.min(itemAmount, categoryAllocatedAmount);
        
        // Generate fallback due date if AI didn't provide one
        let dueDate = item.dueDate;
        if (!dueDate) {
          // Generate a reasonable due date based on item name/category
          dueDate = generateFallbackDueDate(item.name, category.name);
        }

        const itemRef = doc(getUserCollectionRef('budgetItems', user.uid));
        
        // Ensure all required fields have valid values
        const itemData = {
          categoryId: categoryRef.id,
          name: item.name || 'Untitled Item',
          amount: adjustedItemAmount, // Use adjusted amount to prevent exceeding category
          notes: item.notes || '',
          dueDate: dueDate, // Due date from AI or fallback
          isPaid: false, // New items are not paid yet
          amountSpent: null, // No amount spent for new items
          isCustom: false,
          isCompleted: false,
          userId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Validate critical fields
        if (itemData.amount === undefined || itemData.amount === null) {
          itemData.amount = 0;
        }
        
        batch.set(itemRef, itemData);
      }
    }

    setBudgetCreationProgress({
      current: totalItems,
      total: totalItems,
      currentItem: 'Saving to database...'
    });

    await batch.commit();
    
    setIsCreatingBudget(false);
    setBudgetCreationProgress(null);
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
      showErrorToast(`Failed to create todo list: ${error.message}`);
    }
  };

  // Assignment handler for budget items (same as todo items)
  const handleAssignBudgetItem = async (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[], itemId?: string) => {
    if (!user) return;

    try {
      // Update the budget item with assignment info
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
              // Silent fail - notification is not critical
            }
          }
        }
        
        const namesText = assigneeNames.join(', ');
        showSuccessToast(`Assigned to ${namesText}`);
      } else {
        showSuccessToast('Assignment removed');
      }
    } catch (error) {
      showErrorToast('Failed to assign budget item');
    }
  };

  // Calculate total budget from actual category allocations
  const userTotalBudget = budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0);

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
    isCreatingBudget,
    budgetCreationProgress,

    // Computed values
    totalSpent: budgetStats.totalSpent,
    totalRemaining: budgetStats.totalRemaining,

    // Setters
    setShowBudgetItemModal,
    setShowVendorIntegrationModal,
    setShowAIAssistant,
    setShowCSVUpload,
    setSelectedBudgetItem,
    setIsCreatingBudget,
    setBudgetCreationProgress,

    // Handlers
    handleAddCategory,
    handleAddMultipleCategories,
    handleEditCategory,
    handleDeleteCategory,
    handleDeleteAllCategories,
    handleClearAllBudgetData,
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