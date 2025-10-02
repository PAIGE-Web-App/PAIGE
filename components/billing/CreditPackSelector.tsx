'use client';

import { useState } from 'react';
import { Sparkles, Zap, ChevronDown } from 'lucide-react';

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  description: string;
  perfectFor: string[];
  isPopular?: boolean;
}

const creditPacks: CreditPack[] = [
  {
    id: 'credits_12',
    credits: 12,
    price: 2,
    pricePerCredit: 0.17,
    description: 'Perfect for light usage',
    perfectFor: ['Light daily usage', 'Trying new features']
  },
  {
    id: 'credits_25',
    credits: 25,
    price: 4,
    pricePerCredit: 0.16,
    description: 'Great for moderate usage',
    perfectFor: ['Light daily usage', 'Trying new features']
  },
  {
    id: 'credits_50',
    credits: 50,
    price: 7,
    pricePerCredit: 0.14,
    description: 'Popular choice for regular users',
    perfectFor: ['Regular planning sessions', 'Multiple AI features'],
    isPopular: true
  },
  {
    id: 'credits_100',
    credits: 100,
    price: 12,
    pricePerCredit: 0.12,
    description: 'Best value for heavy users',
    perfectFor: ['Intensive planning', 'Heavy AI usage', 'Special projects']
  },
  {
    id: 'credits_200',
    credits: 200,
    price: 20,
    pricePerCredit: 0.10,
    description: 'Maximum value pack',
    perfectFor: ['Intensive planning', 'Heavy AI usage', 'Special projects']
  }
];

interface CreditPackSelectorProps {
  onPurchase: (packId: string) => void;
  loading: boolean;
}

export default function CreditPackSelector({ onPurchase, loading }: CreditPackSelectorProps) {
  const [selectedPack, setSelectedPack] = useState(creditPacks[2]); // Default to 50 credits
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handlePurchase = () => {
    onPurchase(selectedPack.id);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="text-center mb-6">
        <h5 className="text-xl font-semibold text-[#332B42] mb-2 flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-[#805d93]" />
          Buy Additional Credits
        </h5>
        <p className="text-gray-600 text-sm">
          Need more credits for special projects? Purchase bonus credits that never expire and are used first.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {/* Credit Pack Selector */}
        <div className="relative mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Credit Pack
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#805d93] focus:border-transparent flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-[#332B42]">
                  {selectedPack.credits} Credits
                  {selectedPack.isPopular && (
                    <span className="ml-2 bg-[#805d93] text-white text-xs px-2 py-1 rounded-full">
                      Best Value
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  ${selectedPack.price} • ${selectedPack.pricePerCredit.toFixed(2)} per credit
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {creditPacks.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => {
                      setSelectedPack(pack);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                      selectedPack.id === pack.id ? 'bg-[#805d93] bg-opacity-10' : ''
                    }`}
                  >
                    <div className="font-semibold text-[#332B42] flex items-center gap-2">
                      {pack.credits} Credits
                      {pack.isPopular && (
                        <span className="bg-[#805d93] text-white text-xs px-2 py-1 rounded-full">
                          Best Value
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      ${pack.price} • ${pack.pricePerCredit.toFixed(2)} per credit
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Pack Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-[#332B42] mb-1">
              ${selectedPack.price}
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {selectedPack.credits} credits • ${selectedPack.pricePerCredit.toFixed(2)} per credit
            </div>
            <div className="text-sm text-gray-700">
              {selectedPack.description}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Zap className="w-4 h-4 text-[#805d93]" />
              <span className="font-medium">Perfect for:</span>
            </div>
            <ul className="space-y-1 ml-6">
              {selectedPack.perfectFor.map((item, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#805d93] rounded-full"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full btn-primary py-3 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Buy {selectedPack.credits} Credits
            </>
          )}
        </button>
      </div>
    </div>
  );
}
