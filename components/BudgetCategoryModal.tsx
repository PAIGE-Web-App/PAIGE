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
  onUpdateBudgetRange?: (newRange: { min: number; max: number }) => Promise<void>;
  jiggleAllocatedAmount?: boolean;
}

const BudgetCategoryModal: React.FC<BudgetCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onSave,
  onDelete,
  budgetCategories,
  userBudgetRange,
  onUpdateBudgetRange,
  jiggleAllocatedAmount = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    allocatedAmount: '',
  });
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [autoUpdateBudget, setAutoUpdateBudget] = useState(false);
  const [budgetWarningData, setBudgetWarningData] = useState<{
    exceedAmount: number;
    newTotalAllocated: number;
    newBudgetRange: { min: number; max: number };
  } | null>(null);

  useEffect(() => {
    if (category && isOpen) {
      setFormData({
        name: category.name,
        allocatedAmount: category.allocatedAmount.toString(),
      });
    }
  }, [category, isOpen]);

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
    
    if (userBudgetRange && newTotalAllocated > userBudgetRange.max && !showBudgetWarning) {
      const exceedAmount = newTotalAllocated - userBudgetRange.max;
      const newBudgetRange = {
        min: userBudgetRange.min,
        max: Math.round(newTotalAllocated * 1.2) // Add 20% buffer
      };
      
      setBudgetWarningData({
        exceedAmount,
        newTotalAllocated,
        newBudgetRange
      });
      setShowBudgetWarning(true);
      return;
    }

    // If auto-update is enabled, update budget range first
    if (autoUpdateBudget && budgetWarningData && onUpdateBudgetRange) {
      onUpdateBudgetRange(budgetWarningData.newBudgetRange);
    }

    onSave(category.id!, {
      name: formData.name.trim(),
      allocatedAmount: allocatedAmount,
    });
    
    // Reset form data and close modal
    setFormData({ name: '', allocatedAmount: '' });
    setShowBudgetWarning(false);
    setBudgetWarningData(null);
    setAutoUpdateBudget(false);
    onClose();
  };

  const handleContinueWithUpdate = async () => {
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

    // Update budget range first if checkbox is checked
    if (autoUpdateBudget && budgetWarningData && onUpdateBudgetRange) {
      await onUpdateBudgetRange(budgetWarningData.newBudgetRange);
    }

    onSave(category.id!, {
      name: formData.name.trim(),
      allocatedAmount: allocatedAmount,
    });
    
    // Reset form data and close modal
    setFormData({ name: '', allocatedAmount: '' });
    setShowBudgetWarning(false);
    setBudgetWarningData(null);
    setAutoUpdateBudget(false);
    onClose();
  };

  const handleDelete = () => {
    if (!category || !onDelete) return;
    
    if (window.confirm(`Are you sure you want to delete "${category.name}"? This will also delete all items in this category.`)) {
      onDelete(category.id!);
      // Reset form data and close modal
      setFormData({ name: '', allocatedAmount: '' });
      setShowBudgetWarning(false);
      setBudgetWarningData(null);
      setAutoUpdateBudget(false);
      onClose();
    }
  };

  const handleClose = () => {
    // Reset form data and close modal
    setFormData({ name: '', allocatedAmount: '' });
    setShowBudgetWarning(false);
    setBudgetWarningData(null);
    setAutoUpdateBudget(false);
    onClose();
  };

  if (!isOpen || !category) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={handleClose} // Close modal when clicking outside
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-w-sm p-6 relative flex flex-col items-center"
          onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <h5 className="h5 mb-4 text-left">Edit Category</h5>

          {/* Budget Warning Banner */}
          {showBudgetWarning && budgetWarningData && (
            <div className="w-full mb-4 p-4 bg-amber-50 border border-amber-200 rounded-[5px]">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">
                    Budget Range Exceeded
                  </h4>
                  <p className="text-sm text-amber-700 mb-3">
                    This allocation would exceed your current budget range by{' '}
                    <span className="font-semibold">${budgetWarningData.exceedAmount.toLocaleString()}</span>.
                  </p>
                  
                  <div className="flex items-start gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="autoUpdateBudget"
                      checked={autoUpdateBudget}
                      onChange={(e) => setAutoUpdateBudget(e.target.checked)}
                      className="mt-1 w-4 h-4 text-amber-600 bg-white border-amber-300 rounded focus:ring-amber-500 focus:ring-2"
                    />
                    <label htmlFor="autoUpdateBudget" className="text-sm text-amber-700">
                      I confirm that by submitting, my budget range will be updated to{' '}
                      <span className="font-semibold">
                        ${budgetWarningData.newBudgetRange.min.toLocaleString()} - ${budgetWarningData.newBudgetRange.max.toLocaleString()}
                      </span>{' '}
                      to accommodate this allocation.
                    </label>
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setShowBudgetWarning(false);
                        setAutoUpdateBudget(false);
                        setBudgetWarningData(null);
                      }}
                      className="px-3 py-1 text-xs text-amber-700 border border-amber-300 rounded hover:bg-amber-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleContinueWithUpdate}
                      className="px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
                    >
                      Continue with Update
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          <div className={jiggleAllocatedAmount ? 'animate-jiggle' : ''}>
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

        {!showBudgetWarning && (
          <div className="flex justify-end w-full mt-6">
            <div className="flex gap-2">
              <button
                onClick={handleClose}
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
        )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BudgetCategoryModal; 


