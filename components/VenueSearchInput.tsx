"use client";

import { useState, useRef, useEffect } from 'react';

interface VenueSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  setVenueMetadata: (venue: any | null) => void;
  placeholder?: string;
  weddingLocation?: string;
  disabled?: boolean;
}

export default function VenueSearchInput({ 
  value, 
  onChange, 
  setVenueMetadata, 
  placeholder = "Search for venues...",
  weddingLocation,
  disabled = false 
}: VenueSearchInputProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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
      return;
    }

    // Debounce the API call
    debounceTimer.current = setTimeout(async () => {
      if (inputValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      
      try {
        // Use our own venue search API with better control
        const response = await fetch('/api/venue-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchTerm: inputValue,
            weddingLocation: weddingLocation || 'United States',
            maxResults: 8
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Venue search results:', data.venues);
          setSuggestions(data.venues || []);
        } else {
          console.error('Venue search failed:', response.status);
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Venue search error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelect = (venue: any) => () => {
    onChange(venue.name);
    setSuggestions([]);
    setVenueMetadata(venue);
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
      <input
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded border-[#AB9C95] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] appearance-none ${disabled ? 'bg-[#F3F2F0] text-[#AB9C95] cursor-not-allowed' : 'bg-white text-[#332B42]'}`}
      />
      
      {suggestions.length > 0 && !disabled && (
        <ul className="absolute z-10 bg-white border border-[#AB9C95] rounded mt-1 w-full max-h-48 overflow-y-auto shadow-lg">
          {suggestions.map((venue) => (
            <li
              key={venue.place_id}
              className="px-3 py-2 cursor-pointer hover:bg-[#F3F2F0] text-sm"
              onClick={handleSelect(venue)}
            >
              <div className="font-medium">{venue.name}</div>
              <div className="text-xs text-gray-500">{venue.formatted_address}</div>
              {venue.rating && (
                <div className="text-xs text-gray-400">
                  ⭐ {venue.rating} ({venue.user_ratings_total} reviews)
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#A85C36]"></div>
        </div>
      )}
      
      {weddingLocation && (
        <div className="text-xs text-gray-500 mt-1">
          Searching venues near: {weddingLocation}
        </div>
      )}
    </div>
  );
} 