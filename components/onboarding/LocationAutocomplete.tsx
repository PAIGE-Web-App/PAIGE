'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import { debounce } from '@/utils/requestBatcher';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter wedding location",
  className = "w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  const autocompleteService = useRef<any>(null);
  const sessionToken = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Google Places Autocomplete service
  useEffect(() => {
    const initializeAutocomplete = () => {
      console.log('🔍 Checking Google Maps API availability...');
      console.log('🔍 window.google:', !!window.google);
      console.log('🔍 window.google.maps:', !!window.google?.maps);
      console.log('🔍 window.google.maps.places:', !!window.google?.maps?.places);
      console.log('🔍 window.google.maps.places.AutocompleteService:', !!window.google?.maps?.places?.AutocompleteService);
      
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
        try {
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
          console.log('✅ Google Places Autocomplete service initialized');
          return true;
        } catch (error) {
          console.error('❌ Error initializing autocomplete service:', error);
          return false;
        }
      }
      return false;
    };

    if (initializeAutocomplete()) {
      return;
    }

    // Poll for Google Maps API availability
    const pollForGoogleMaps = setInterval(() => {
      if (initializeAutocomplete()) {
        clearInterval(pollForGoogleMaps);
      }
    }, 1000);

    // Cleanup after 10 seconds
    setTimeout(() => {
      clearInterval(pollForGoogleMaps);
      console.log('❌ Google Places API still not available after 10 seconds');
    }, 10000);

    return () => clearInterval(pollForGoogleMaps);
  }, []);

  const debouncedLocationSearch = debounce((inputValue: string) => {
    console.log('🔍 Location search triggered:', inputValue);
    console.log('🔍 Autocomplete service available:', !!autocompleteService.current);
    
    if (!autocompleteService.current || inputValue.length < 2) {
      console.log('❌ No autocomplete service or input too short');
      setSuggestions([]);
      return;
    }
    
    setIsLoading(true);
    const request = {
      input: inputValue,
      types: ['geocode'],
      sessionToken: sessionToken.current,
    };

    autocompleteService.current.getPlacePredictions(request, (predictions: any, status: any) => {
      console.log('🔍 Google Places API response:', { predictions, status });
      setIsLoading(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        console.log('✅ Got predictions:', predictions.length);
        setSuggestions(predictions);
      } else {
        console.log('❌ No predictions or error:', status);
        setSuggestions([]);
      }
    });
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    
    // Calculate dropdown position
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    
    // Clear suggestions if input is empty
    if (inputValue.length === 0) {
      setSuggestions([]);
      return;
    }
    
    debouncedLocationSearch(inputValue);
  };

  const handleLocationSelect = (suggestion: any) => {
    onChange(suggestion.description);
    setSuggestions([]);
  };

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputRef.current && value) {
              const rect = inputRef.current.getBoundingClientRect();
              setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
              });
            }
          }}
          className={className}
          placeholder={placeholder}
        />
      </div>

      {/* Portal-based Location Dropdown */}
      {suggestions.length > 0 && dropdownPosition && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed z-[10001] mt-1"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <ul className="bg-white border border-gray-300 rounded max-h-48 overflow-y-auto shadow-lg">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm"
                onClick={() => handleLocationSelect(suggestion)}
              >
                {suggestion.description}
                <span className="text-xs text-gray-500 ml-2">
                  {suggestion.types?.includes('locality') ? 'City' :
                   suggestion.types?.includes('administrative_area_level_1') ? 'State' :
                   suggestion.types?.includes('country') ? 'Country' : 'Location'}
                </span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
};

export default LocationAutocomplete;
