import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import type { BudgetCategory } from '@/types/budget';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: BudgetCategory | null;
  onDelete: (categoryId: string) => void;
}

const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onDelete,
}) => {
  const handleDelete = () => {
    if (!category) return;
    onDelete(category.id!);
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

          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            <h5 className="h5 mb-2">Delete Category</h5>
            
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold text-[#332B42]">"{category.name}"</span>?
            </p>
            
            <p className="text-xs text-red-600 mb-6">
              This action cannot be undone. All budget items in this category will also be deleted.
            </p>

            <div className="flex justify-center w-full gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete Category
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeleteCategoryModal; 