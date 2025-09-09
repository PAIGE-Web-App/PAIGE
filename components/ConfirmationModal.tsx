import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  warningMessage?: string;
  confirmButtonText: string;
  confirmButtonIcon?: React.ReactNode;
  confirmButtonVariant?: 'danger' | 'warning';
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warningMessage,
  confirmButtonText,
  confirmButtonIcon,
  confirmButtonVariant = 'danger',
  isLoading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  const confirmButtonClass = confirmButtonVariant === 'danger' 
    ? 'btn-primary px-4 py-2 text-sm flex items-center gap-2 bg-red-600 hover:bg-red-700'
    : 'btn-primary px-4 py-2 text-sm flex items-center gap-2 bg-amber-600 hover:bg-amber-700';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header row with title and close button */}
          <div className="flex items-center justify-between mb-4">
            <h5 className="h5 text-left flex-1">{title}</h5>
            <button
              onClick={onClose}
              className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full ml-4"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              confirmButtonVariant === 'danger' ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              <AlertTriangle className={`w-8 h-8 ${
                confirmButtonVariant === 'danger' ? 'text-red-600' : 'text-amber-600'
              }`} />
            </div>
          </div>

          {/* Description */}
          <div className="mb-6 text-left">
            <p className="text-sm text-gray-600 mb-3">
              {message}
            </p>
            {warningMessage && (
              <p className="text-xs text-red-600">
                {warningMessage}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="btn-primaryinverse px-4 py-2 text-sm"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={confirmButtonClass}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                confirmButtonIcon || <Trash2 className="w-4 h-4" />
              )}
              {confirmButtonText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConfirmationModal;
