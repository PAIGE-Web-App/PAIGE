import React from 'react';
import { DollarSign, Edit2, Trash2, Link, UserPlus, CheckCircle, Circle } from 'lucide-react';
import { BudgetItem, BudgetCategory } from '@/types/budget';
import { useAuth } from '@/contexts/AuthContext';
import { addDoc } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useNewlyAddedItems } from '@/hooks/useNewlyAddedItems';

interface BudgetItemsMobileProps {
  selectedCategory: BudgetCategory | null;
  budgetItems: BudgetItem[];
  searchQuery?: string;
  triggerAddItem?: boolean;
  onTriggerAddItemComplete?: () => void;
  onEditItem: (item: BudgetItem) => void;
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (item: BudgetItem) => void;
  onAssign?: (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[], itemId: string) => Promise<void>;
}

const BudgetItemsMobile: React.FC<BudgetItemsMobileProps> = ({
  selectedCategory,
  budgetItems,
  searchQuery = '',
  triggerAddItem = false,
  onTriggerAddItemComplete,
  onEditItem,
  onDeleteItem,
  onLinkVendor,
  onAssign,
}) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { newlyAddedItems, addNewItem, isNewlyAdded } = useNewlyAddedItems();
  
  // Handle trigger add item from top bar (Mobile only)
  React.useEffect(() => {
    if (triggerAddItem && selectedCategory && typeof window !== 'undefined' && window.innerWidth < 1024) {
      handleAddItem();
      onTriggerAddItemComplete?.();
    }
  }, [triggerAddItem, selectedCategory]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDisplayAmount = (amount: number) => {
    if (amount === 0) {
      return '-';
    }
    return formatCurrency(amount);
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

  // Handle direct item creation
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
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-[#AB9C95]">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Select a Category</h3>
            <p className="text-sm">Choose a budget category to view its items</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full min-h-0">
      {/* Items List */}
      {categoryItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#AB9C95] p-4">
          <div className="text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items in this category</p>
            <p className="text-xs">Tap "Add Item" to get started</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {categoryItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white border border-[#E0DBD7] rounded-[8px] p-4 ${
                isNewlyAdded(item.id!) ? 'animate-green-flash' : ''
              }`}
            >
              {/* Item Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-[#332B42] truncate">
                      {item.name}
                    </h4>
                    {item.isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#AB9C95] flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-lg font-bold text-[#A85C36]">
                    {formatDisplayAmount(item.amount)}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => onEditItem(item)}
                    className="p-2 hover:bg-[#F3F2F0] rounded-[5px] transition-colors"
                    title="Edit item"
                  >
                    <Edit2 className="w-4 h-4 text-[#AB9C95]" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id!)}
                    className="p-2 hover:bg-red-50 rounded-[5px] transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Item Details */}
              <div className="space-y-2">
                {/* Notes */}
                {item.notes && (
                  <div className="text-sm text-[#7A7A7A] bg-[#F8F6F4] p-2 rounded-[5px]">
                    {item.notes}
                  </div>
                )}

                {/* Vendor Link */}
                {item.vendorName && (
                  <div className="flex items-center gap-2 text-sm text-[#7A7A7A]">
                    <Link className="w-4 h-4" />
                    <span className="truncate">{item.vendorName}</span>
                  </div>
                )}

                {/* Assignees */}
                {item.assignedTo && item.assignedTo.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-[#7A7A7A]">
                    <UserPlus className="w-4 h-4" />
                    <span className="truncate">
                      {item.assignedTo.length} assignee{item.assignedTo.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-[#E0DBD7]">
                  <button
                    onClick={() => onLinkVendor(item)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0] transition-colors"
                  >
                    <Link className="w-4 h-4" />
                    {item.vendorName ? 'Change Vendor' : 'Link Vendor'}
                  </button>
                  
                  {onAssign && (
                    <button
                      onClick={() => onAssign([], [], [], item.id!)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0] transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Assign
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BudgetItemsMobile; 
