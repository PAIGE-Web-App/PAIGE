import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ArrowDown } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DowngradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: string;
  targetPlan: string;
  currentCredits: number;
  targetCredits: number;
  renewalDate?: string;
  isLoading?: boolean;
  prorationAmount?: string; // Refund amount in dollars (e.g., "12.50")
}

const DowngradeConfirmationModal: React.FC<DowngradeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  targetPlan,
  currentCredits,
  targetCredits,
  renewalDate,
  isLoading = false,
  prorationAmount,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-[9999]"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header row with title and close button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <h5 className="h5 text-center flex-1">Downgrade Plan</h5>
            <button
              onClick={onClose}
              className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full flex-1 flex justify-end"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 text-left">
              Are you sure you want to downgrade from <strong>{currentPlan}</strong> to <strong>{targetPlan}</strong>?
            </p>
            {prorationAmount ? (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  💰 You'll receive a refund of <strong>${prorationAmount}</strong> for the unused portion of your current plan.
                </p>
                <p className="text-xs text-green-600 mt-1">
                  The refund will be processed immediately to your original payment method.
                </p>
              </div>
            ) : renewalDate ? (
              <p className="text-sm text-gray-500 text-left mt-2">
                You'll keep your current plan benefits until {renewalDate}, then switch to {targetPlan}.
              </p>
            ) : null}
          </div>

          {/* Warning section */}
          <div className="mb-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h5 className="text-orange-800 mb-2">What you'll lose:</h5>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Daily credits will decrease from {currentCredits} to {targetCredits}</li>
                    <li>• Access to premium features will be removed</li>
                    <li>• Some data may be archived or limited</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Reassurance message */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 text-left">
              You can always upgrade again later if you change your mind.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-primaryinverse flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Downgrading...
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4" />
                  Confirm Downgrade
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default DowngradeConfirmationModal;
