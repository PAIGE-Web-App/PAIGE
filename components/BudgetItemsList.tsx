import React from 'react';
import { Plus, Edit2, Trash2, DollarSign, Link } from 'lucide-react';
import { BudgetItem, BudgetCategory } from '@/types/budget';

interface BudgetItemsListProps {
  selectedCategory: BudgetCategory | null;
  budgetItems: BudgetItem[];
  onAddItem: () => void;
  onEditItem: (item: BudgetItem) => void;
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (item: BudgetItem) => void;
}

const BudgetItemsList: React.FC<BudgetItemsListProps> = ({
  selectedCategory,
  budgetItems,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onLinkVendor,
}) => {
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
          <button
            onClick={onAddItem}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
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