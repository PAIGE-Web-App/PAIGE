'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCredits } from '@/contexts/CreditContext';
import { useRouter } from 'next/navigation';

export default function MobileCreditBar() {
  const { getRemainingCredits, loading, credits, loadCredits } = useCredits();
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState({ creditsSpent: 0, creditsRemaining: 0 });
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const infoPopoverRef = useRef<HTMLDivElement>(null);

  // Track previous credits for automatic detection
  const [previousCredits, setPreviousCredits] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize previousCredits when credits are first loaded (only once)
  useEffect(() => {
    if (credits && !hasInitialized) {
      const currentTotal = (credits.dailyCredits || 0) + (credits.bonusCredits || 0);
      setPreviousCredits(currentTotal);
      setHasInitialized(true);
    }
  }, [credits, hasInitialized]);

  // Detect credit changes and show popover automatically
  useEffect(() => {
    if (credits && hasInitialized) {
      const currentTotal = (credits.dailyCredits || 0) + (credits.bonusCredits || 0);
      
      // Check if credits decreased (indicating AI function was used)
      if (previousCredits > 0 && currentTotal < previousCredits) {
        const creditsSpent = previousCredits - currentTotal;
        setToastData({ creditsSpent, creditsRemaining: currentTotal });
        setShowToast(true);
      }
      
      // Update previousCredits for next comparison
      setPreviousCredits(currentTotal);
    }
  }, [credits, hasInitialized, previousCredits]);

  // Credit loading and event handling is now managed centrally in CreditProvider
  // No need for individual loadCredits calls or event listeners

  // Click outside handler for info popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the popover AND not on the info icon
      const target = event.target as Node;
      const isInfoIcon = (target as Element)?.closest('button[data-info-icon]');
      
      if (infoPopoverRef.current && 
          !infoPopoverRef.current.contains(target) && 
          !isInfoIcon) {
        setShowInfoPopover(false);
      }
    };

    if (showInfoPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfoPopover]);

  // Auto-close credit usage toast after 4 seconds (like desktop)
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 4000); // Auto-hide after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [showToast]);

  if (loading) {
    return (
      <div className="bg-gray-50 border-t border-[#AB9C95]/10 border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-center">
          <div className="animate-pulse flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-gray-200 rounded"></div>
            <div className="w-20 h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const remainingCredits = getRemainingCredits();
  const dailyCredits = credits?.dailyCredits || 0;
  const bonusCredits = credits?.bonusCredits || 0;
  const hasBonusCredits = bonusCredits > 0;

  return (
    <div className="bg-gray-50 border-t border-[#AB9C95]/10 border-b border-gray-200 px-4 py-2 relative">
      <div className="flex items-center justify-between">
        {/* Credit Display - Horizontal Layout */}
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#805d93]" />
          <div className="flex items-center gap-1">
            {hasBonusCredits ? (
              <div className="text-xs font-medium text-[#2C3E50]">
                {dailyCredits} + <span className="text-[#805d93]">{bonusCredits}</span>
              </div>
            ) : remainingCredits === 0 ? (
              <div className="text-xs font-bold text-red-500">
                0
              </div>
            ) : (
              <motion.div 
                key={remainingCredits} // This triggers animation on change
                initial={{ scale: 1.2, color: '#805d93' }}
                animate={{ scale: 1, color: '#2C3E50' }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-xs font-medium"
              >
                {remainingCredits}
              </motion.div>
            )}
            <span className="text-xs text-[#2C3E50] ml-1">Credit Remaining</span>
            <button
              data-info-icon
              onClick={(e) => {
                e.stopPropagation();
                setShowInfoPopover(!showInfoPopover);
              }}
              className="ml-1 text-[#805d93] hover:text-[#6a4d7a] transition-colors"
            >
              <Info className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Get More Credits Link - Always visible */}
        <button
          onClick={() => router.push('/settings?tab=plan')}
          className="text-xs text-[#805d93] font-medium hover:text-[#6a4d7a] transition-colors"
        >
          Get More Credits
        </button>
      </div>

      {/* Credit Usage Toast - Positioned above the credit bar */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute bottom-full left-4 right-4 mb-2 bg-white border-2 border-[#805d93] rounded-lg shadow-xl p-3 z-50"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-gradient-to-r from-[#805d93] to-[#9f7bb3] rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#332B42] mb-1">
                  Credits Used!
                </div>
                <div className="text-xs text-[#666]">
                  <span className="font-medium text-[#805d93]">{toastData.creditsSpent} credit{toastData.creditsSpent !== 1 ? 's' : ''}</span> spent
                </div>
                <div className="text-xs text-[#666]">
                  <span className="font-medium text-[#805d93]">{toastData.creditsRemaining}</span> remaining
                </div>
              </div>
              
              <button
                onClick={() => setShowToast(false)}
                className="flex-shrink-0 text-[#999] hover:text-[#666] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(toastData.creditsRemaining / (toastData.creditsRemaining + toastData.creditsSpent)) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="h-1 bg-gradient-to-r from-[#805d93] to-[#9f7bb3] rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credit Info Popover - Matches desktop version */}
      <AnimatePresence>
        {showInfoPopover && (
          <motion.div
            ref={infoPopoverRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-full left-4 right-4 mb-2 bg-[#332B42] text-white rounded-lg shadow-xl p-2 z-50"
          >
            <div className="text-xs font-semibold text-white mb-1">
              Paige Credits Remaining:
            </div>
            <div className="text-xs text-white mb-1">
              {dailyCredits} Daily Credits + {bonusCredits} Bonus Credits
            </div>
            <div className="text-[10px] text-white">
              Daily Credits Refresh Daily. Bonus Credits will be Used First!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
