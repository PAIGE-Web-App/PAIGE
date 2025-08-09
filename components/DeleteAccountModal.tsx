import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteAccount: (reason: string) => Promise<void>;
  isDeleting: boolean;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ 
  isOpen, 
  onClose, 
  onDeleteAccount, 
  isDeleting 
}) => {
  const { showErrorToast } = useCustomToast();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [confirmText, setConfirmText] = useState<string>('');

  const reasons = [
    'I found a better alternative',
    'I\'m no longer planning a wedding',
    'The app was too complicated',
    'I didn\'t find it useful',
    'Privacy concerns',
    'Too expensive',
    'Other'
  ];

  const handleDelete = async () => {
    if (confirmText.toLowerCase() !== 'delete my account') {
      showErrorToast('Please type "delete my account" to confirm');
      return;
    }
    
    if (!selectedReason) {
      showErrorToast('Please select a reason for leaving');
      return;
    }

    await onDeleteAccount(selectedReason);
  };

  const handleClose = () => {
    setSelectedReason('');
    setConfirmText('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              title="Close"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h5 className="text-xl font-playfair font-semibold text-[#332B42] mb-2 text-center">
                We're sorry to see you go
              </h5>
              <p className="text-sm text-gray-600 text-center">
                Your account and all associated data will be permanently deleted. This action cannot be undone.
              </p>
            </div>

            <div className="space-y-4">
              {/* Reason for leaving */}
              <div>
                <label className="block text-sm font-medium text-[#332B42] mb-2">
                  Why are you leaving? <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {reasons.map((reason) => (
                    <label key={reason} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="form-radio text-red-600 focus:ring-red-500 mr-2"
                      />
                      <span className="text-sm text-[#332B42]">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Confirmation text */}
              <div>
                <label className="block text-sm font-medium text-[#332B42] mb-2">
                  Type "delete my account" to confirm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="delete my account"
                  className="w-full px-3 py-2 border border-[#AB9C95] rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={handleClose}
                className="btn-primaryinverse px-6 py-2 rounded font-semibold text-sm"
                disabled={isDeleting}
              >
                Keep Account
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isDeleting || !selectedReason || confirmText.toLowerCase() !== 'delete my account'}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Account Deletion'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeleteAccountModal; 