"use client";

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Star } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface WeddingPlannerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  setPlannerMetadata: (planner: any | null) => void;
  placeholder?: string;
  location?: string;
  disabled?: boolean;
}

export default function WeddingPlannerSearchInput({ 
  value, 
  onChange, 
  setPlannerMetadata, 
  placeholder = "Search for wedding planners...",
  location,
  disabled = false 
}: WeddingPlannerSearchInputProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Clear suggestions if input is empty
    if (!inputValue.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce the API call
    debounceTimer.current = setTimeout(async () => {
      if (inputValue.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const response = await fetch('/api/wedding-planner-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchTerm: inputValue,
            location: location || 'United States',
            maxResults: 6
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Wedding planner search results:', data.planners);
          setSuggestions(data.planners || []);
          setShowSuggestions(true);
        } else {
          console.error('Wedding planner search failed:', response.status);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Wedding planner search error:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelect = (planner: any) => () => {
    onChange(planner.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setPlannerMetadata(planner);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full px-3 py-2 pl-10 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((planner, index) => (
            <button
              key={planner.place_id || index}
              onClick={handleSelect(planner)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-[#332B42] truncate">
                      {planner.name}
                    </h4>
                    {planner.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600">{planner.rating}</span>
                        {planner.user_ratings_total && (
                          <span className="text-xs text-gray-500">({planner.user_ratings_total})</span>
                        )}
                      </div>
                    )}
                  </div>
                  {planner.formatted_address && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{planner.formatted_address}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 