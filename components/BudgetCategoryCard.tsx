import React, { useState } from 'react';
import { Edit, Trash2, Plus, DollarSign, Link } from 'lucide-react';
import type { BudgetCategory, BudgetItem } from '@/types/budget';

interface BudgetCategoryCardProps {
  category: BudgetCategory;
  items: BudgetItem[];
  onEditCategory: (categoryId: string, updates: Partial<BudgetCategory>) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddItem: () => void;
  onEditItem: (item: BudgetItem) => void;
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (itemId: string, vendorData: any) => void;
}

const BudgetCategoryCard: React.FC<BudgetCategoryCardProps> = ({
  category,
  items,
  onEditCategory,
  onDeleteCategory,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onLinkVendor,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editAmount, setEditAmount] = useState(category.allocatedAmount.toString());

  const categorySpent = items.reduce((sum, item) => sum + item.amount, 0);
  const categoryRemaining = category.allocatedAmount - categorySpent;
  const categoryPercentage = category.allocatedAmount > 0 ? (categorySpent / category.allocatedAmount) * 100 : 0;

  const handleSaveEdit = () => {
    onEditCategory(category.id, {
      name: editName,
      allocatedAmount: parseFloat(editAmount) || 0,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(category.name);
    setEditAmount(category.allocatedAmount.toString());
    setIsEditing(false);
  };

  return (
    <div className="bg-white border border-[#AB9C95] rounded-[5px] p-4">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-3">
        {isEditing ? (
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-2 py-1 border border-[#AB9C95] rounded text-sm focus:outline-none focus:border-[#A85C36]"
            />
            <input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="w-full px-2 py-1 border border-[#AB9C95] rounded text-sm focus:outline-none focus:border-[#A85C36]"
              placeholder="0"
              min="0"
              step="0.01"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="px-2 py-1 bg-[#A85C36] text-white text-xs rounded hover:bg-[#8B4513]"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-2 py-1 bg-[#AB9C95] text-white text-xs rounded hover:bg-[#8B7D7A]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <h4 className="font-medium text-[#332B42]">{category.name}</h4>
              <div className="flex items-center gap-4 text-sm text-[#AB9C95] mt-1">
                <span>${categorySpent.toLocaleString()} / ${category.allocatedAmount.toLocaleString()}</span>
                <span>{categoryPercentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-[#AB9C95] hover:text-[#A85C36]"
              >
                <Edit className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDeleteCategory(category.id)}
                className="p-1 text-[#AB9C95] hover:text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#E0D6D0] rounded-full h-1 mb-3">
        <div
          className="h-1 rounded-full transition-all duration-300"
          style={{ 
            width: `${Math.min(categoryPercentage, 100)}%`,
            backgroundColor: category.color || '#A85C36'
          }}
        />
      </div>

      {/* Budget Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-2 bg-[#F8F6F4] rounded border border-[#E0D6D0]">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#332B42]">{item.name}</span>
                {item.vendorName && (
                  <span className="text-xs text-[#A85C36] bg-[#F8F6F4] px-1 rounded">
                    {item.vendorName}
                  </span>
                )}
              </div>
              {item.notes && (
                <p className="text-xs text-[#AB9C95] mt-1">{item.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-[#332B42]">
                ${item.amount.toLocaleString()}
              </span>
              <button
                onClick={() => onEditItem(item)}
                className="p-1 text-[#AB9C95] hover:text-[#A85C36]"
              >
                <Edit className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-1 text-[#AB9C95] hover:text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item Button */}
      <button
        onClick={onAddItem}
        className="w-full mt-3 p-2 border border-dashed border-[#AB9C95] rounded-[5px] text-[#AB9C95] hover:border-[#A85C36] hover:text-[#A85C36] transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Item
      </button>

      {/* Category Summary */}
      <div className="mt-3 pt-3 border-t border-[#E0D6D0]">
        <div className="flex justify-between text-xs text-[#AB9C95]">
          <span>Remaining</span>
          <span className={categoryRemaining >= 0 ? 'text-[#332B42]' : 'text-red-600'}>
            ${categoryRemaining.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BudgetCategoryCard; 