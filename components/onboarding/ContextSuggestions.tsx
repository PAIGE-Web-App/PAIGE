'use client';

import React, { useState, useEffect } from 'react';
import { WandSparkles } from 'lucide-react';

interface ContextSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
}

const ContextSuggestions: React.FC<ContextSuggestionsProps> = ({
  value,
  onChange,
  className = "w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] resize-none",
  placeholder = "E.g. I went to college in the area so local vendors are important, or I want eco-friendly options, or we're having a destination wedding.",
  rows = 4
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Wedding vision context suggestions (same as signup flow)
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
    console.log('🎯 Selecting suggestion:', suggestion.description);
    onChange(suggestion.description);
    setShowSuggestions(false);
    console.log('✅ Suggestion selected, dropdown closed');
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSuggestions && !(event.target as Element).closest('.context-suggestions-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-[#332B42]">
            <WandSparkles className="w-4 h-4 text-[#A85C36]" />
            Additional Context:
          </label>
          <div className="relative context-suggestions-container">
            <button
              type="button"
              onClick={() => {
                console.log('💡 Suggestions button clicked, current state:', showSuggestions);
                setShowSuggestions(!showSuggestions);
                console.log('💡 New suggestions state:', !showSuggestions);
              }}
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
                    onClick={() => {
                      console.log('🖱️ Suggestion button clicked:', suggestion.title);
                      handleSuggestionSelect(suggestion);
                    }}
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          placeholder={placeholder}
          rows={rows}
        />
        <p className="text-xs text-[#7A7A7A]">
          This helps Paige generate more personalized recommendations for your wedding plan.
        </p>
      </div>

    </>
  );
};

export default ContextSuggestions;
