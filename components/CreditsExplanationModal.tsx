import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Clock, Star, Users, Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCredits } from '@/contexts/CreditContext';

interface CreditsExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function CreditsExplanationModal({ isOpen, onClose, onComplete }: CreditsExplanationModalProps) {
  const router = useRouter();
  const { credits } = useCredits();
  const [hasInteracted, setHasInteracted] = React.useState(false);

  // Determine user's membership tier based on credits data
  const getUserTier = () => {
    if (!credits) {
      return {
        name: 'Loading...',
        dailyCredits: 0,
        features: []
      };
    }

    // Map subscription tier to display name and features
    const tierMap = {
      'free': {
        name: 'Free',
        dailyCredits: credits.dailyCredits,
        features: ['Basic AI features', 'Limited daily credits', 'Community support']
      },
      'starter': {
        name: 'Starter',
        dailyCredits: credits.dailyCredits,
        features: ['Enhanced AI features', 'More daily credits', 'Priority support']
      },
      'premium': {
        name: 'Premium',
        dailyCredits: credits.dailyCredits,
        features: ['Full AI features', 'Unlimited credits', 'Premium support']
      }
    };

    return tierMap[credits.subscriptionTier] || tierMap['free'];
  };

  const userTier = getUserTier();

  const handleClose = () => {
    // Mark as interacted when user closes the modal
    if (!hasInteracted) {
      setHasInteracted(true);
      onComplete?.();
    }
    onClose();
  };

  const handleGetMoreCredits = () => {
    handleClose();
    router.push('/settings?tab=billing');
  };

  const handleUpgradeAccount = () => {
    handleClose();
    router.push('/settings?tab=billing');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">How Credits Work</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Daily Credits Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Daily Credits</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {credits?.dailyCredits || 0}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Your membership tier: <span className="font-semibold text-gray-900">{userTier.name}</span>
                  </div>
                </div>

                {/* Daily Refresh */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <h6 className="text-gray-900">Daily Refresh</h6>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">
                    Credits refresh on a daily basis at midnight your time and are based on your membership tier. 
                    Your membership tier is <span className="font-semibold">{userTier.name}</span> and you get{' '}
                    <span className="font-semibold">{userTier.dailyCredits} credits per day</span>.
                  </p>
                </div>

                {/* Bonus Credits */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h6 className="text-gray-900">Earn Bonus Credits</h6>
                  </div>
                  <div className="ml-8 space-y-2">
                    <div className="flex items-start space-x-2">
                      <Users className="w-4 h-4 text-green-500 mt-0.5" />
                      <p className="text-sm text-gray-600">
                        Add verified emails to vendors to help the community
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Flag className="w-4 h-4 text-red-500 mt-0.5" />
                      <p className="text-sm text-gray-600">
                        Flag vendors that are improperly tagged
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Bonus credits are awarded automatically when you help improve the Paige community!
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <h6 className="text-gray-900">What Credits Are Used For</h6>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>AI-powered todo list generation</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>Smart moodboard creation</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>Seating chart optimization</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>File analysis and insights</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>Email draft generation</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={handleGetMoreCredits}
                  className="flex-1 btn-primary"
                >
                  Get More Credits
                </button>
                <button
                  onClick={handleUpgradeAccount}
                  className="flex-1 btn-primaryinverse"
                >
                  Upgrade Account
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
