import React from 'react';
import { DollarSign } from 'lucide-react';
import { BudgetItem, BudgetCategory } from '@/types/budget';
import BudgetItemComponent from './BudgetItemComponent';
import BudgetItemsTable from './BudgetItemsTable';
import { useAuth } from '@/hooks/useAuth';
import { addDoc } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useNewlyAddedItems } from '@/hooks/useNewlyAddedItems';

interface BudgetItemsListProps {
  selectedCategory: BudgetCategory | null;
  budgetItems: BudgetItem[];
  searchQuery?: string;
  triggerAddItem?: boolean;
  onTriggerAddItemComplete?: () => void;
  onEditItem: (item: BudgetItem) => void;
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (item: BudgetItem) => void;
  onAssign?: (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[], itemId: string) => Promise<void>;
  viewMode: 'cards' | 'table';
}

const BudgetItemsList: React.FC<BudgetItemsListProps> = ({
  selectedCategory,
  budgetItems,
  searchQuery = '',
  triggerAddItem = false,
  onTriggerAddItemComplete,
  onEditItem,
  onDeleteItem,
  onLinkVendor,
  onAssign,
  viewMode,
}) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { newlyAddedItems, addNewItem, isNewlyAdded } = useNewlyAddedItems();
  
  // Handle trigger add item from top bar
  React.useEffect(() => {
    if (triggerAddItem && selectedCategory) {
      handleAddItem();
      onTriggerAddItemComplete?.();
    }
  }, [triggerAddItem, selectedCategory]);

  // Clear newly added items after animation
  React.useEffect(() => {
    if (newlyAddedItems.size > 0) {
      const timer = setTimeout(() => {
        // Auto-cleared by the hook
      }, 1000); // Clear after 1 second (same as animation duration)
      return () => clearTimeout(timer);
    }
  }, [newlyAddedItems]);
  

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryItems = () => {
    if (!selectedCategory) return [];
    let items = budgetItems.filter(item => item.categoryId === selectedCategory.id);
    
    // Apply search filter
    if (searchQuery.trim()) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return items;
  };

  const categoryItems = getCategoryItems();
  const totalSpent = categoryItems.reduce((sum, item) => sum + item.amount, 0);
  const remaining = selectedCategory ? selectedCategory.allocatedAmount - totalSpent : 0;

  // Handle direct item creation (like todo items)
  const handleAddItem = async () => {
    if (!user || !selectedCategory) {
      showErrorToast('Please select a category first');
      return;
    }
    
    try {
      const docRef = await addDoc(getUserCollectionRef('budgetItems', user.uid), {
        categoryId: selectedCategory.id,
        name: 'New Budget Item (Click to Edit)',
        amount: 0,
        notes: null,
        isCustom: true,
        isCompleted: false,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Track newly added item for green flash animation
      addNewItem(docRef.id);
      
      showSuccessToast('Budget item added successfully!');
    } catch (error: any) {
      console.error('Error adding budget item:', error);
      showErrorToast(`Failed to add budget item: ${error.message}`);
    }
  };

  if (!selectedCategory) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-[#AB9C95]">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Select a Category</h3>
            <p className="text-sm">Choose a budget category from the sidebar to view its items</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full min-h-0">
      {/* Items List */}
      {categoryItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#AB9C95]">
          <div className="text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items in this category</p>
            <p className="text-xs">Click "Add Item" to get started</p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="flex-1 flex flex-col h-full min-h-0">
          <BudgetItemsTable
            budgetItems={categoryItems}
            onDeleteItem={onDeleteItem}
            onLinkVendor={onLinkVendor}
            onAssign={onAssign}
            onAddItem={handleAddItem}
            newlyAddedItems={newlyAddedItems}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {categoryItems.map((item) => (
            <BudgetItemComponent
              key={item.id}
              budgetItem={item}
              onDeleteItem={onDeleteItem}
              onLinkVendor={onLinkVendor}
              onAssign={onAssign}
              isNewlyAdded={isNewlyAdded(item.id!)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BudgetItemsList; 