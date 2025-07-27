import React, { useState } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Link, Save, X } from 'lucide-react';
import { BudgetItem, BudgetCategory } from '@/types/budget';
import MicroMenu from './MicroMenu';
import { useAuth } from '@/hooks/useAuth';
import { addDoc } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import { useCustomToast } from '@/hooks/useCustomToast';

interface BudgetItemsListProps {
  selectedCategory: BudgetCategory | null;
  budgetItems: BudgetItem[];
  onAddItem: () => void;
  onEditItem: (item: BudgetItem) => void;
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (item: BudgetItem) => void;
  onEditCategory?: (category: BudgetCategory) => void;
  onDeleteCategory?: (category: BudgetCategory) => void;
}

const BudgetItemsList: React.FC<BudgetItemsListProps> = ({
  selectedCategory,
  budgetItems,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onLinkVendor,
  onEditCategory,
  onDeleteCategory,
}) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // State for inline item creation
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    amount: 0,
    notes: ''
  });
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
    return budgetItems.filter(item => item.categoryId === selectedCategory.id);
  };

  const categoryItems = getCategoryItems();
  const totalSpent = categoryItems.reduce((sum, item) => sum + item.amount, 0);
  const remaining = selectedCategory ? selectedCategory.allocatedAmount - totalSpent : 0;

  // Handle inline item creation
  const handleStartAddItem = () => {
    if (!selectedCategory) {
      showErrorToast('Please select a category first');
      return;
    }
    setIsAddingItem(true);
    setNewItemData({ name: '', amount: 0, notes: '' });
  };

  const handleCancelAddItem = () => {
    setIsAddingItem(false);
    setNewItemData({ name: '', amount: 0, notes: '' });
  };

  const handleSaveNewItem = async () => {
    if (!user || !selectedCategory) return;
    
    if (!newItemData.name.trim()) {
      showErrorToast('Item name cannot be empty');
      return;
    }

    try {
      await addDoc(getUserCollectionRef('budgetItems', user.uid), {
        categoryId: selectedCategory.id,
        name: newItemData.name.trim(),
        amount: newItemData.amount || 0,
        notes: newItemData.notes.trim() || null,
        isCustom: true,
        isCompleted: false,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      showSuccessToast(`Budget item "${newItemData.name}" added!`);
      setIsAddingItem(false);
      setNewItemData({ name: '', amount: 0, notes: '' });
    } catch (error: any) {
      console.error('Error adding budget item:', error);
      showErrorToast(`Failed to add budget item: ${error.message}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveNewItem();
    } else if (e.key === 'Escape') {
      handleCancelAddItem();
    }
  };

  if (!selectedCategory) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b border-[#AB9C95]">
          <h2 className="text-xl font-semibold text-[#332B42] mb-2">Welcome to Your Budget</h2>
          <p className="text-sm text-[#AB9C95]">Select a category from the sidebar to start managing your budget items</p>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-[#AB9C95]">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Category Selected</h3>
            <p className="text-sm">Choose a budget category from the sidebar to view its items</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-[#AB9C95]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold text-[#332B42]">{selectedCategory.name}</h2>
            <p className="text-sm text-[#AB9C95]">
              {formatCurrency(totalSpent)} of {formatCurrency(selectedCategory.allocatedAmount)} spent
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartAddItem}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
            
            {/* Category Edit/Delete Menu */}
            {(onEditCategory || onDeleteCategory) && (
              <MicroMenu
                items={[
                  ...(onEditCategory ? [{
                    label: 'Edit Category',
                    onClick: () => onEditCategory(selectedCategory)
                  }] : []),
                  ...(onDeleteCategory ? [{
                    label: 'Delete Category',
                    onClick: () => onDeleteCategory(selectedCategory),
                    className: 'text-red-600'
                  }] : [])
                ]}
                title="Category options"
              />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#F3F2F0] rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all ${
              totalSpent > selectedCategory.allocatedAmount ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ 
              width: `${Math.min((totalSpent / selectedCategory.allocatedAmount) * 100, 100)}%` 
            }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-[#AB9C95]">
            {((totalSpent / selectedCategory.allocatedAmount) * 100).toFixed(1)}% used
          </span>
          <span className={`font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `${formatCurrency(Math.abs(remaining))} over budget`}
          </span>
        </div>
      </div>

      {/* Inline Add Item Form */}
      {isAddingItem && (
        <div className="p-4 border-b border-[#AB9C95] bg-[#F8F6F4]">
          <div className="bg-white border border-[#E0DBD7] rounded-[5px] p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-medium text-[#332B42]">New Budget Item</h3>
              <button
                onClick={handleCancelAddItem}
                className="p-1 text-[#AB9C95] hover:text-[#332B42] hover:bg-[#F3F2F0] rounded"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#332B42] mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItemData.name}
                  onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                  onKeyDown={handleKeyDown}
                  className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
                  placeholder="Enter item name"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#332B42] mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={newItemData.amount}
                    onChange={(e) => setNewItemData({ ...newItemData, amount: parseFloat(e.target.value) || 0 })}
                    onKeyDown={handleKeyDown}
                    className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#332B42] mb-1">
                  Notes
                </label>
                <textarea
                  value={newItemData.notes}
                  onChange={(e) => setNewItemData({ ...newItemData, notes: e.target.value })}
                  onKeyDown={handleKeyDown}
                  className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
                  placeholder="Add notes..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-[#AB9C95]">
                Press ⌘+Enter to save, Esc to cancel
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelAddItem}
                  className="px-3 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNewItem}
                  disabled={!newItemData.name.trim()}
                  className="btn-primary px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Save Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        {categoryItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#AB9C95]">
            <div className="text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No items in this category</p>
              <p className="text-xs">Click "Add Item" to get started</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {categoryItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4 hover:border-[#A85C36] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-[#332B42] mb-1">{item.name}</h3>
                    {item.notes && (
                      <p className="text-sm text-[#AB9C95] mb-2">{item.notes}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-semibold text-[#A85C36]">
                        {formatCurrency(item.amount)}
                      </span>
                      {item.vendorName && (
                        <span className="text-[#AB9C95] flex items-center gap-1">
                          <Link className="w-3 h-3" />
                          {item.vendorName}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => onLinkVendor(item)}
                      className="p-1 text-[#AB9C95] hover:text-[#A85C36] hover:bg-[#F3F2F0] rounded"
                      title="Link vendor"
                    >
                      <Link className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditItem(item)}
                      className="p-1 text-[#AB9C95] hover:text-[#A85C36] hover:bg-[#F3F2F0] rounded"
                      title="Edit item"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id!)}
                      className="p-1 text-[#AB9C95] hover:text-red-600 hover:bg-[#F3F2F0] rounded"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {item.isCompleted && (
                  <div className="text-xs text-green-600 font-medium">
                    ✓ Completed
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetItemsList; 