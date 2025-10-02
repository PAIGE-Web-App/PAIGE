'use client';

import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PlanCardProps {
  name: string;
  price: number;
  creditsPerDay: number;
  bonusCredits: number;
  features: string[];
  isPopular?: boolean;
  isCurrent?: boolean;
  isLowerTier?: boolean;
  isProTier?: boolean;
  onUpgrade: () => void;
  loading?: boolean;
}

export default function PlanCard({
  name,
  price,
  creditsPerDay,
  bonusCredits,
  features,
  isPopular = false,
  isCurrent = false,
  isLowerTier = false,
  isProTier = false,
  onUpgrade,
  loading = false
}: PlanCardProps) {
  const { userType } = useAuth();

  return (
    <div className={`relative bg-white rounded-lg border-2 p-6 flex flex-col h-full ${
      isPopular ? 'border-[#805d93] shadow-lg' : 'border-gray-200'
    } ${isCurrent ? 'ring-2 ring-[#805d93] ring-opacity-50' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-[#805d93] text-white text-xs px-3 py-1 rounded-full font-medium">
            Most Popular
          </span>
        </div>
      )}
      

      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-[#332B42] mb-2">{name}</h3>
        <div className="mb-2">
          <span className="text-3xl font-bold text-[#332B42]">${price}</span>
          <span className="text-gray-600">/month</span>
        </div>
        <div className="text-sm text-gray-600">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#805d93]" />
            <span className="font-medium">{creditsPerDay} credits/day</span>
          </div>
          <div className="text-xs text-gray-500">
            + {bonusCredits} bonus credits on upgrade
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6 flex-grow">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{feature}</span>
          </div>
        ))}
      </div>

             <button
               onClick={onUpgrade}
               disabled={loading || isCurrent}
               className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                 isCurrent
                   ? 'btn-primary disabled'
                   : isLowerTier
                   ? 'btn-primaryinverse'
                   : isProTier
                   ? 'btn-primaryinverse'
                   : 'btn-primary'
               } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
               {loading ? 'Processing...' : isCurrent ? 'Current Plan' : isLowerTier ? 'Select Plan' : 'Upgrade Now'}
             </button>
    </div>
  );
}
