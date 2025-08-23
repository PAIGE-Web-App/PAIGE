'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { useRouter } from 'next/navigation';

export default function VerticalNavCreditDisplay() {
  const { getRemainingCredits, loading, credits } = useCredits();
  const router = useRouter();

  if (loading) {
    return (
      <div className="animate-pulse mb-6">
        <div className="h-12 bg-gray-200 rounded-lg w-20"></div>
      </div>
    );
  }

  const remainingCredits = getRemainingCredits();
  const dailyCredits = credits?.dailyCredits || 0;
  const bonusCredits = credits?.bonusCredits || 0;
  const hasBonusCredits = bonusCredits > 0;

  const handleUpgradeClick = () => {
    router.push('/settings?tab=credits');
  };

  return (
    <div className="mb-6 flex justify-center">
              <button
          onClick={handleUpgradeClick}
          className="group relative bg-[#F8F6F4] rounded-lg p-2 transition-all duration-200 hover:bg-[#F3F2F0] cursor-pointer"
          style={{
            background: 'linear-gradient(145deg, #F8F6F4, #F8F6F4)',
            border: '1px solid transparent',
            backgroundImage: `
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
            ) : (
              <div className="text-sm font-medium text-[#2C3E50] leading-tight">
                {remainingCredits}
              </div>
            )}
            <div className="text-[10px] text-[#2C3E50] leading-tight">
              Credits
            </div>
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
              <div className="font-semibold mb-1">Paige Credits Remaining:</div>
              <div className="text-[11px] text-gray-200 mb-2">
                {dailyCredits} Daily Credits + {bonusCredits} Bonus Credits
              </div>
              <div className="text-[10px] text-gray-300">
                Daily Credits Refresh Daily. Bonus Credits will be Used First!
              </div>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-[#332B42] border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
          </div>
        </button>
    </div>
  );
}
