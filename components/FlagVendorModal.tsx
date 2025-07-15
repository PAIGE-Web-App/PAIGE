import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface FlagVendorModalProps {
  vendor: {
    id: string;
    name: string;
  };
  onClose: () => void;
  onSubmit: (reason: string, customReason?: string) => void;
  isSubmitting?: boolean;
}

const FLAG_REASONS = [
  'Not a real Wedding Vendor',
  'Inappropriate Content',
  'Duplicate Listing',
  'Wrong Category',
  'Out of Business',
  'Poor Quality/Reviews',
  'Other'
];

const FlagVendorModal: React.FC<FlagVendorModalProps> = ({ 
  vendor, 
  onClose, 
  onSubmit, 
  isSubmitting = false 
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleSubmit = () => {
    if (!selectedReason) return;
    
    if (selectedReason === 'Other' && !customReason.trim()) {
      return; // Don't submit if "Other" is selected but no custom reason provided
    }
    
    onSubmit(selectedReason, selectedReason === 'Other' ? customReason : undefined);
  };

  const canSubmit = selectedReason && (selectedReason !== 'Other' || customReason.trim());

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
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-w-sm p-6 relative flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>

          <h3 className="font-playfair text-xl font-semibold text-[#332B42] mb-4 text-center">
            Flag Vendor
          </h3>

          <div className="w-full mb-4">
            <p className="text-sm text-gray-600 mb-4 text-center">
              Help us improve our vendor catalog by flagging "{vendor.name}" if it doesn't belong here.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Reason for flagging *
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">Select a reason...</option>
                {FLAG_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {selectedReason === 'Other' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#332B42] mb-2">
                  Please specify *
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please provide details about why this vendor should be flagged..."
                  className="w-full p-3 border border-gray-300 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:border-transparent resize-none"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-[5px] hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`flex-1 px-4 py-2 text-sm rounded-[5px] transition-colors ${
                canSubmit && !isSubmitting
                  ? 'bg-[#A85C36] text-white hover:bg-[#8B4A2A]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Flag'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FlagVendorModal; 