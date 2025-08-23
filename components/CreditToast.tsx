import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

interface CreditToastProps {
  isVisible: boolean;
  creditsSpent: number;
  creditsRemaining: number;
  onClose: () => void;
}

const CreditToast: React.FC<CreditToastProps> = ({
  isVisible,
  creditsSpent,
  creditsRemaining,
  onClose
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto-hide after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed left-4 bottom-24 z-[9999] bg-white border-2 border-[#805d93] rounded-lg shadow-xl p-4 max-w-sm"
          style={{ 
            left: '80px', // Position near the vertical nav
            bottom: '120px' // Above the credits display
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-r from-[#805d93] to-[#9f7bb3] rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#332B42] mb-1">
                Credits Used!
              </div>
              <div className="text-xs text-[#666]">
                <span className="font-medium text-[#805d93]">{creditsSpent} credit{creditsSpent !== 1 ? 's' : ''}</span> spent
              </div>
              <div className="text-xs text-[#666]">
                <span className="font-medium text-[#805d93]">{creditsRemaining}</span> remaining
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="flex-shrink-0 text-[#999] hover:text-[#666] transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(creditsRemaining / (creditsRemaining + creditsSpent)) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-1 bg-gradient-to-r from-[#805d93] to-[#9f7bb3] rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreditToast;
