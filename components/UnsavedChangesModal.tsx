import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Unsaved Changes',
  message = 'Are you sure you want to leave? You will lose all unsaved changes.',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[10px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onCancel}
              className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              title="Close"
            >
              <X size={20} />
            </button>
            <h5 className="h5 mb-4">{title}</h5>
            <p className="text-sm text-[#364257] mb-6">{message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium rounded-[5px] border border-[#AB9C95] text-[#332B42] hover:bg-[#F3F2F0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium rounded-[5px] bg-[#D63030] text-white hover:bg-[#C02B2B] transition-colors"
              >
                Yes, I'm sure
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UnsavedChangesModal; 