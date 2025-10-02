'use client';

import { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';

interface CreditPackCardProps {
  name: string;
  credits: number;
  price: number;
  description: string;
  isPopular?: boolean;
  onPurchase: () => void;
  loading?: boolean;
}

export default function CreditPackCard({
  name,
  credits,
  price,
  description,
  isPopular = false,
  onPurchase,
  loading = false
}: CreditPackCardProps) {
  const pricePerCredit = (price / credits).toFixed(2);

  return (
    <div className={`relative bg-white rounded-lg border-2 p-6 ${
      isPopular ? 'border-[#805d93] shadow-lg' : 'border-gray-200'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-[#805d93] text-white text-xs px-3 py-1 rounded-full font-medium">
            Best Value
          </span>
        </div>
      )}

      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-[#805d93]" />
          <h3 className="text-lg font-semibold text-[#332B42]">{name}</h3>
        </div>
        
        <div className="mb-2">
          <span className="text-2xl font-bold text-[#332B42]">${price}</span>
        </div>
        
        <div className="text-sm text-gray-600 mb-1">
          {credits} credits • ${pricePerCredit} per credit
        </div>
        
        <div className="text-xs text-gray-500">
          {description}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span>Perfect for:</span>
        </div>
        <ul className="text-xs text-gray-600 space-y-1">
          {credits <= 25 && (
            <>
              <li>• Light daily usage</li>
              <li>• Trying new features</li>
            </>
          )}
          {credits > 25 && credits <= 50 && (
            <>
              <li>• Regular planning sessions</li>
              <li>• Multiple AI features</li>
            </>
          )}
          {credits > 50 && (
            <>
              <li>• Intensive planning</li>
              <li>• Heavy AI usage</li>
              <li>• Special projects</li>
            </>
          )}
        </ul>
      </div>

      <button
        onClick={onPurchase}
        disabled={loading}
        className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
          isPopular
            ? 'bg-[#805d93] text-white hover:bg-[#6b4d7a]'
            : 'bg-gray-100 text-[#332B42] hover:bg-gray-200'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Processing...' : `Buy ${credits} Credits`}
      </button>
    </div>
  );
}
