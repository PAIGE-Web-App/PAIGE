import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TightDeadlineWarningBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
  onContinue: () => void;
  warningMessage: string;
  recommendedAction: string;
}

const TightDeadlineWarningBanner: React.FC<TightDeadlineWarningBannerProps> = ({
  isVisible,
  onDismiss,
  onContinue,
  warningMessage,
  recommendedAction
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl mx-4"
        >
          <div className="bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-work text-sm font-medium text-amber-800 mb-2">
                  ⚠️ Tight Timeline Warning
                </h3>
                <p className="font-work text-sm text-amber-700 mb-3">
                  {warningMessage}
                </p>
                <p className="font-work text-xs text-amber-600 mb-4">
                  {recommendedAction}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onContinue}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    Continue with AI Deadlines
                  </button>
                  <button
                    onClick={onDismiss}
                    className="btn-primaryinverse text-xs px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <button
                onClick={onDismiss}
                className="text-amber-500 hover:text-amber-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TightDeadlineWarningBanner;
