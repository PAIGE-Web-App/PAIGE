import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, AlertTriangle, RefreshCw } from 'lucide-react';

interface GmailReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReauth: () => void;
  isLoading?: boolean;
}

const GmailReauthModal: React.FC<GmailReauthModalProps> = ({ 
  isOpen, 
  onClose, 
  onReauth,
  isLoading = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
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
              <h5 className="h5 text-left flex-1">Gmail Re-authorization Required</h5>
              <button
                onClick={onClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                title="Close"
                disabled={isLoading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Description */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 text-left">
                To send Gmail emails, we need to re-authenticate your Google account. This ensures your Gmail access is up to date and secure.
              </p>
            </div>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Warning Box */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-800 font-medium mb-1">
                    Gmail Access Expired
                  </p>
                  <p className="text-xs text-red-700">
                    Your Gmail permissions have expired. Please re-authorize to continue sending emails through Gmail.
                  </p>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">What you'll get back:</h6>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3"></div>
                  Send Gmail emails directly from Paige
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3"></div>
                  Reply to Gmail conversations seamlessly
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3"></div>
                  Real-time Gmail push notifications
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3"></div>
                  Automatic todo suggestions from new emails
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="btn-primaryinverse px-4 py-2 text-sm flex-1"
              >
                Cancel
              </button>
              <button
                onClick={onReauth}
                disabled={isLoading}
                className="btn-primary px-4 py-2 text-sm flex-1 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Re-authorizing...' : 'Re-authorize Gmail'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GmailReauthModal;
