import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotEnoughCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits?: number;
  currentCredits?: number;
  feature?: string;
  accountInfo?: {
    tier: string;
    dailyCredits: number;
    refreshTime: string;
  };
}

const NotEnoughCreditsModal: React.FC<NotEnoughCreditsModalProps> = ({ 
  isOpen, 
  onClose, 
  requiredCredits = 2,
  currentCredits = 0,
  feature = 'this feature',
  accountInfo
}) => {
  const router = useRouter();

  const handleUpgradeClick = () => {
    onClose();
    router.push('/settings?tab=credits');
  };

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
            <h5 className="h5 text-left flex-1">Oops! You need more credits</h5>
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
              <div className="w-16 h-16 bg-[#F8F6F4] rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#805d93]" />
              </div>
            </div>

            {/* Description */}
            <div className="mb-6 text-left">
              <p className="text-sm text-gray-600">
                You can wait until tomorrow to refresh your daily credits, or you can upgrade your account now to get instant access to more credits, or you can buy more credits too!
              </p>
            </div>

            {/* Account Information */}
            {accountInfo && (
              <div className="bg-[#F8F6F4] rounded-lg p-4 mb-6">
                <h6 className="font-medium text-[#332B42] mb-3">Your Account</h6>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Current tier:</span>
                    <span className="font-medium text-[#332B42] capitalize">{accountInfo.tier}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Daily credits:</span>
                    <span className="font-medium text-[#332B42]">{accountInfo.dailyCredits || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Refresh time:</span>
                    <span className="font-medium text-[#332B42]">{accountInfo.refreshTime}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleUpgradeClick}
                className="btn-primary px-6 py-3 text-sm flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Get More Credits
              </button>
              <button
                onClick={onClose}
                className="btn-primaryinverse px-6 py-3 text-sm"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotEnoughCreditsModal;
