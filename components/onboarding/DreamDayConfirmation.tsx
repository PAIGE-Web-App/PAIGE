'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';

interface DreamDayConfirmationProps {
  userName: string;
  partnerName: string;
  weddingDate: string | null;
  weddingLocation: string;
  selectedVenueMetadata: any | null;
  maxBudget: number;
  guestCount: number;
  vibe: string[];
  additionalContext: string;
  setAdditionalContext: (value: string) => void;
}

const DreamDayConfirmation: React.FC<DreamDayConfirmationProps> = ({
  userName,
  partnerName,
  weddingDate,
  weddingLocation,
  selectedVenueMetadata,
  maxBudget,
  guestCount,
  vibe,
  additionalContext,
  setAdditionalContext
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { showSuccessToast } = useCustomToast();

  // Wedding vision context suggestions (similar to Create with Paige tab)
  const suggestions = [
    {
      title: "Local Community Connection",
      description: "I went to college in the area and so it's important to have local vendors who know the community"
    },
    {
      title: "Eco-Friendly Focus",
      description: "I want Paige to focus on eco-friendly options since sustainability is really important to us"
    },
    {
      title: "Destination Wedding",
      description: "We're having a destination wedding so I need vendors who can travel and work in different locations"
    },
    {
      title: "Cultural Traditions",
      description: "We have specific cultural traditions that need to be incorporated into our wedding planning"
    },
    {
      title: "Tight Timeline",
      description: "We're working with a tight timeline and need vendors who can accommodate quick turnarounds"
    },
    {
      title: "Small Business Support",
      description: "We want to support small, family-owned businesses in our vendor selections"
    },
    {
      title: "Dietary Restrictions",
      description: "We have dietary restrictions and need vendors who can accommodate our specific needs"
    },
    {
      title: "Micro-Wedding",
      description: "We're planning a micro-wedding and want vendors who specialize in intimate celebrations"
    }
  ];

  // Handle suggestion select
  const handleSuggestionSelect = (suggestion: typeof suggestions[0]) => {
    setAdditionalContext(suggestion.description);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSuggestions && !(event.target as Element).closest('.suggestions-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  // Calculate season from wedding date
  const getSeason = (date: string | null): string => {
    if (!date) return 'TBD';
    
    const month = new Date(date).getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  };

  // Format date for display
  const formatDate = (date: string | null): string => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format budget for display
  const formatBudget = (budget: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budget);
  };

  // Generate the confirmation paragraph
  const generateConfirmationText = () => {
    const season = getSeason(weddingDate);
    const formattedDate = formatDate(weddingDate);
    const formattedBudget = formatBudget(maxBudget);
    const venueName = selectedVenueMetadata?.name || 'TBD';
    const location = weddingLocation || 'TBD';
    const vibeText = vibe.length > 0 ? vibe.join(', ') : 'TBD';

    return `My name is ${userName}. My partner ${partnerName} and I are looking to get married in ${season} on ${formattedDate} in ${location}. We've found a main venue at ${venueName} and are hoping to stay within ${formattedBudget} for our ${guestCount} guests. We're going for a ${vibeText} vibe.`;
  };



  return (
    <div className="w-full">

      {/* Confirmation Paragraph */}
      <div className="text-[#332B42] leading-relaxed text-base mb-6 font-work">
        <div className="border-t border-[#E0D6D0] pt-4 mb-4">
          <p className="mb-4">
            My name is <span className="font-semibold text-[#A85C36]">{userName}</span> and my partner's name is <span className="font-semibold text-[#A85C36]">{partnerName}</span>.{' '}
            {!weddingDate ? (
              <>We haven't decided on our wedding date just yet.</>
            ) : !weddingLocation ? (
              <>We're looking to get married in the <span className="font-semibold text-[#A85C36]">{getSeason(weddingDate)}</span> time on <span className="font-semibold text-[#A85C36]">{formatDate(weddingDate)}</span>, but haven't decided on the location just yet.</>
            ) : (
              <>We're looking to get married in the <span className="font-semibold text-[#A85C36]">{getSeason(weddingDate)}</span> time on <span className="font-semibold text-[#A85C36]">{formatDate(weddingDate)}</span> in <span className="font-semibold text-[#A85C36]">{weddingLocation}</span>.</>
            )}
          </p>
          
          <p className="mb-4">
            {!selectedVenueMetadata?.name ? (
              <>We're still in the process of finding our main wedding venue, but we're hoping to stay within <span className="font-semibold text-[#A85C36]">{formatBudget(maxBudget)}</span> for our <span className="font-semibold text-[#A85C36]">{guestCount}</span> guests.</>
            ) : (
              <>We've found a main venue at <span className="font-semibold text-[#A85C36]">{selectedVenueMetadata.name}</span> and are hoping to stay within <span className="font-semibold text-[#A85C36]">{formatBudget(maxBudget)}</span> for our <span className="font-semibold text-[#A85C36]">{guestCount}</span> guests.</>
            )}
          </p>
          
          <p>
            {vibe.length > 0 && vibe.includes('Still Figuring it Out') ? (
              <>We're still trying to figure out the style for our dream day!</>
            ) : (
              <>We're going for a <span className="font-semibold text-[#A85C36]">{vibe.length > 0 ? vibe.join(', ') : 'TBD'}</span> vibe.</>
            )}
          </p>
        </div>
      </div>

      {/* Additional Context */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-[#332B42] font-work-sans font-normal">
            Additional context about your wedding vision:
          </label>
          <div className="relative suggestions-container">
            <button
              type="button"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-xs text-[#A85C36] hover:text-[#8B4513] font-medium flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Suggestions
              <svg className={`w-3 h-3 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showSuggestions && (
              <div className="absolute right-0 top-6 w-80 bg-white border border-[#E0DBD7] rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                {suggestions.slice(0, 5).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-[#F8F6F4] border-b border-[#E0DBD7] last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-[#332B42] text-sm">{suggestion.title}</div>
                    <div className="text-xs text-[#6B7280] mt-1">{suggestion.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <textarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="E.g. I went to college in the area so local vendors are important, or I want eco-friendly options, or we're having a destination wedding."
          className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] resize-none font-work"
          rows={6}
        />
        <p className="text-xs text-[#364257] mt-1">
          This helps Paige understand your unique preferences and find the perfect local vendors for you.
        </p>
      </div>


    </div>
  );
};

export default DreamDayConfirmation;
