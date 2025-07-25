import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';
import type { BudgetItem, BudgetCategory } from '@/types/budget';

interface BudgetItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetItem: BudgetItem;
  categories: BudgetCategory[];
  onSave: (itemId: string, updates: Partial<BudgetItem>) => void;
  onDelete: (itemId: string) => void;
}

const BudgetItemModal: React.FC<BudgetItemModalProps> = ({
  isOpen,
  onClose,
  budgetItem,
  categories,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState({
    name: budgetItem.name,
    amount: budgetItem.amount,
    categoryId: budgetItem.categoryId,
    notes: budgetItem.notes || '',
  });

  const handleSave = () => {
    onSave(budgetItem.id!, formData);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this budget item?')) {
      onDelete(budgetItem.id!);
      onClose();
    }
  };

  if (!isOpen) return null;

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
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
          onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <h5 className="h5 mb-4 text-center">Edit Budget Item</h5>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              Item Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
              placeholder="Enter item name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              Amount
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              Category
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
              placeholder="Add notes..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-center w-full mt-6">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm mr-auto"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
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

export default BudgetItemModal; 