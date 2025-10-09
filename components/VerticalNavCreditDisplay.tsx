'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { useCredits } from '@/contexts/CreditContext';
import { useRouter } from 'next/navigation';
import CreditToast from './CreditToast';

export default function VerticalNavCreditDisplay() {
  const { getRemainingCredits, loading, credits, loadCredits } = useCredits();
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState({ creditsSpent: 0, creditsRemaining: 0 });

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

  // Auto-refresh credits when component mounts (fallback for webhook failures)
  useEffect(() => {
    if (credits) {
      // Only refresh if credits seem stale (older than 2 minutes)
      const lastUpdate = credits.updatedAt;
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      
      if (lastUpdate && new Date(lastUpdate) < twoMinutesAgo) {
        console.log('🔄 Sidebar: Auto-refreshing stale credits...');
        loadCredits();
      }
    }
  }, [credits, loadCredits]);

  if (loading) {
    return (
      <div className="mb-6 flex justify-center">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg w-16"></div>
        </div>
      </div>
    );
  }

  // Calculate credits safely
  const dailyCredits = credits?.dailyCredits || 0;
  const bonusCredits = credits?.bonusCredits || 0;
  const remainingCredits = dailyCredits + bonusCredits;
  const hasBonusCredits = bonusCredits > 0;
  
  


  const handleUpgradeClick = () => {
    router.push('/settings?tab=credits');
  };

  // Removed debug functions - no longer needed

  return (
    <div className="mb-6 flex justify-center">
      <button
        onClick={handleUpgradeClick}
        className="group relative bg-[#F8F6F4] rounded-lg p-2 transition-all duration-200 hover:bg-[#F3F2F0] cursor-pointer"
        style={{
          background: 'linear-gradient(145deg, #F8F6F4, #F8F6F4)',
          border: remainingCredits === 0 ? '1px solid #ef4444' : '1px solid transparent',
          backgroundImage: remainingCredits === 0 ? `
            linear-gradient(145deg, #F8F6F4, #F8F6F4),
            linear-gradient(145deg, #ef4444, #ef4444, #ef4444, #ef4444)
          ` : `
            linear-gradient(145deg, #F8F6F4, #F8F6F4),
            linear-gradient(145deg, #805d93, #805d93, #805d93, #805d93)
          `,
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#805d93] group-hover:text-[#6a4d7a] transition-colors" />
          <div className="text-center">
            {hasBonusCredits ? (
              <div className="text-xs font-medium text-[#2C3E50] leading-tight">
                {dailyCredits} + <span className="text-[#805d93]">{bonusCredits}</span>
              </div>
            ) : remainingCredits === 0 ? (
              <div className="text-sm font-bold text-red-500 leading-tight">
                0
              </div>
            ) : (
              <div className="text-sm font-medium text-[#2C3E50] leading-tight">
                {remainingCredits}
              </div>
            )}
            <div className="text-[10px] text-[#2C3E50] leading-tight w-[40px] text-center">
              Credits
            </div>
            {remainingCredits === 0 && (
              <>
                <div className="w-6 h-px bg-gray-300 my-1 mx-auto"></div>
                <div className="text-[9px] text-[#805d93] font-medium w-[40px] text-center leading-tight">
                  Get<br />More!
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Subtle glow effect on hover */}
        <div
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-200 pointer-events-none"
          style={{
            background: 'linear-gradient(145deg, #805d93, #805d93, #805d93, #805d93)',
            filter: 'blur(4px)',
            zIndex: -1
          }}
        />

        {/* Hover Tooltip - matching other nav items */}
        <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-[#332B42] text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-64">
          <div className="text-left">
            <div className="font-semibold mb-1">
              {remainingCredits === 0 ? 'Out of Credits!' : 'Paige Credits Remaining:'}
            </div>
            {remainingCredits === 0 ? (
              <div className="text-[11px] text-red-200 mb-2">
                You're all out of credits! Click to get more.
              </div>
            ) : (
              <div className="text-[11px] text-gray-200 mb-2">
                {dailyCredits} Daily Credits + {bonusCredits} Bonus Credits
              </div>
            )}
            <div className="text-[10px] text-gray-300">
              {remainingCredits === 0 ? 'Upgrade your plan or buy more credits to continue using AI features!' : 'Daily Credits Refresh Daily. Bonus Credits will be Used First!'}
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-[#332B42] border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
        </div>
      </button>

      {/* Credit Toast */}
      <CreditToast
        isVisible={showToast}
        creditsSpent={toastData.creditsSpent}
        creditsRemaining={toastData.creditsRemaining}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
