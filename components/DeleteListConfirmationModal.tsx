// components/DeleteListConfirmationModal.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface TodoList {
  id: string;
  name: string;
}

interface DeleteListConfirmationModalProps {
  list: TodoList;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteListConfirmationModal: React.FC<DeleteListConfirmationModalProps> = ({ list, onConfirm, onClose }) => {
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
          className="bg-white rounded-[10px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
          onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <h3 className="font-playfair text-xl font-semibold text-[#332B42] mb-4">Confirm List Deletion</h3>

          <p className="text-sm text-[#364257] mb-4">
            Are you sure you want to delete the list "
            <span className="font-semibold">{list.name}</span>"?
          </p>
          <p className="text-sm text-[#E5484D] font-medium mb-6">
            Removing this list will also permanently delete all tasks associated with it.
            If you want to keep your tasks, please move them to another list first.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-[5px] border border-[#AB9C95] text-[#332B42] hover:bg-[#F3F2F0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium rounded-[5px] bg-[#D63030] text-white hover:bg-[#C02B2B] transition-colors"
            >
              Delete List
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeleteListConfirmationModal;
