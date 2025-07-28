import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';
import type { BudgetCategory } from '@/types/budget';

interface BudgetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: BudgetCategory | null;
  onSave: (categoryId: string, updates: Partial<BudgetCategory>) => void;
  onDelete?: (categoryId: string) => void;
  budgetCategories: BudgetCategory[];
  userBudgetRange: { min: number; max: number } | null;
}

const BudgetCategoryModal: React.FC<BudgetCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onSave,
  onDelete,
  budgetCategories,
  userBudgetRange,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    allocatedAmount: '',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        allocatedAmount: category.allocatedAmount.toString(),
      });
    }
  }, [category]);

  const handleSave = () => {
    if (!category) return;
    
    if (!formData.name.trim()) {
      alert('Category name cannot be empty');
      return;
    }

    const allocatedAmount = parseFloat(formData.allocatedAmount);
    if (isNaN(allocatedAmount) || allocatedAmount < 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Check if this would exceed the user's budget range
    const currentTotalAllocated = budgetCategories
      .filter(cat => cat.id !== category.id)
      .reduce((sum, cat) => sum + cat.allocatedAmount, 0);
    
    const newTotalAllocated = currentTotalAllocated + allocatedAmount;
    
    if (userBudgetRange && newTotalAllocated > userBudgetRange.max) {
      const exceedAmount = newTotalAllocated - userBudgetRange.max;
      const shouldContinue = window.confirm(
        `This allocation would exceed your budget range by $${exceedAmount.toLocaleString()}. Would you like to continue anyway?`
      );
      if (!shouldContinue) return;
    }

    onSave(category.id!, {
      name: formData.name.trim(),
      allocatedAmount: allocatedAmount,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!category || !onDelete) return;
    
    if (window.confirm(`Are you sure you want to delete "${category.name}"? This will also delete all items in this category.`)) {
      onDelete(category.id!);
      onClose();
    }
  };

  if (!isOpen || !category) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose} // Close modal when clicking outside
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-w-sm p-6 relative flex flex-col items-center"
          onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <h5 className="h5 mb-4 text-center">Edit Category</h5>

        <div className="space-y-4 w-full">
          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              Category Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              Allocated Amount
            </label>
            <input
              type="number"
              value={formData.allocatedAmount}
              onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
              className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
              placeholder="0.00"
              min="0"
              step="100"
            />
          </div>
        </div>

        <div className="flex justify-center w-full mt-6">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BudgetCategoryModal; 


