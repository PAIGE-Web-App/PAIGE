"use client";

import { useState, useRef, useEffect } from 'react';
import { debounce, googlePlacesBatcher } from '@/utils/requestBatcher';
import LoadingSpinner from '@/components/LoadingSpinner';

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
  const autocompleteService = useRef<any>(null);
  const sessionToken = useRef<any>(null);

  // Initialize Google Places Autocomplete service
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, []);

  const handleSelect = (suggestion: any) => () => {
    console.log('🔵 [VenueSearch] handleSelect called with:', suggestion.description);
    
    // Update the input value immediately
    onChange(suggestion.description);
    
    // Clear suggestions immediately
    setSuggestions([]);
    
    const { place_id, types } = suggestion;

    // Set venue metadata
    if (setVenueMetadata) {
      console.log('🔵 [VenueSearch] Fetching place details for:', place_id);
      
      // Use Google Maps JavaScript API directly
      if (typeof window !== 'undefined' && window.google && window.google.maps) {
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        
        service.getDetails({
          placeId: place_id,
          fields: ['name', 'formatted_address', 'geometry', 'place_id', 'photos', 'url', 'vicinity', 'rating', 'user_ratings_total', 'price_level', 'types']
        }, (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            console.log('🔵 [VenueSearch] Got metadata:', place);
            setVenueMetadata(place);
          } else {
            console.log('🔵 [VenueSearch] No metadata result, status:', status);
            setVenueMetadata(null);
          }
        });
      } else {
        console.error('🔴 [VenueSearch] Google Maps API not available');
        setVenueMetadata(null);
      }
    }
  };

  // Create debounced search function
  const debouncedSearch = debounce((inputValue: string) => {
    if (!autocompleteService.current || inputValue.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    // For venue searches, include location in the search query itself
    let searchInput = inputValue;
    if (weddingLocation) {
      // For venue searches, include the wedding location in the search
      searchInput = `${inputValue} wedding venue ${weddingLocation}`;
    } else {
      searchInput = `${inputValue} wedding venue`;
    }

    const request: any = {
      input: searchInput,
      types: ['establishment'],
      sessionToken: sessionToken.current,
    };

    autocompleteService.current.getPlacePredictions(request, (predictions: any[], status: any) => {
      setIsLoading(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setSuggestions(predictions);
      } else {
        setSuggestions([]);
      }
    });
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    
    // Clear suggestions if input is empty
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }

    // Use debounced search
    debouncedSearch(inputValue);
  };

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
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              className="px-3 py-2 cursor-pointer hover:bg-[#F3F2F0] text-sm"
              onClick={handleSelect(suggestion)}
            >
              <div className="font-medium">{suggestion.description}</div>
              <div className="text-xs text-gray-500">
                {suggestion.types?.includes('establishment') ? 'Venue' : 'Location'}
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <LoadingSpinner size="sm" />
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