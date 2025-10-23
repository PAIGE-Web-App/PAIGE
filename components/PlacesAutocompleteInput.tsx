"use client";

import { useEffect, useState, useRef } from 'react';
import { debounce, googlePlacesBatcher } from '@/utils/requestBatcher';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function PlacesAutocompleteInput({ value, onChange, setVenueMetadata, setSelectedLocationType, placeholder, types = ['geocode'], disabled = false, locationBias = null, onBlur, componentId }: { value: string; onChange: (val: string) => void; setVenueMetadata: (venue: any | null) => void; setSelectedLocationType: (type: string | null) => void; placeholder: string; types?: string[]; disabled?: boolean; locationBias?: { lat: number; lng: number; radius?: number } | null; onBlur?: () => void; componentId?: string; }) {
  
  // Debug logging

  
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

    // Cleanup function
    return () => {
      // Cleanup handled by debounce utility
    };
  }, []);

  // No need for this useEffect - we handle value changes in handleInputChange

  const handleSelect = (suggestion: any) => () => {
    console.log('🔵 [PlacesAutocomplete] handleSelect called with:', suggestion.description);
    
    // Update the input value immediately
    console.log('🔵 [PlacesAutocomplete] Calling onChange with:', suggestion.description);
    onChange(suggestion.description);
    
    // Clear suggestions immediately
    setSuggestions([]);
    console.log('🔵 [PlacesAutocomplete] Cleared suggestions');
    
    // Set a flag in the parent component to prevent blur from firing
    // We'll use a custom event to communicate this
    window.dispatchEvent(new CustomEvent('placesAutocompleteSelected', { 
      detail: { 
        description: suggestion.description,
        componentId: componentId 
      } 
    }));

    const { place_id, types } = suggestion;

    const allowedTypes = ['locality', 'administrative_area_level_1', 'country'];
    const foundType = types.find((type: string) => allowedTypes.includes(type)) || null;
    setSelectedLocationType(foundType);

    // Set venue metadata and let the parent handle updating the input value
    if (setVenueMetadata) {
      console.log('🔵 [PlacesAutocomplete] Suggestion types:', types);
      const venueTypes = ['street_address', 'premise', 'establishment', 'point_of_interest'];
      const hasVenueType = types.some((type: string) => venueTypes.includes(type));
      console.log('🔵 [PlacesAutocomplete] Has venue type:', hasVenueType);
      
      if (hasVenueType) {
        console.log('🔵 [PlacesAutocomplete] Fetching place details for:', place_id);
        // Use our batcher for place details
        googlePlacesBatcher.getPlaceDetails(place_id)
          .then((result) => {
            console.log('🔵 [PlacesAutocomplete] Place details result:', result);
            if (result && result.success && result.data) {
              console.log('🔵 [PlacesAutocomplete] Got metadata:', result.data);
              console.log('🔵 [PlacesAutocomplete] Metadata name:', result.data.name);
              console.log('🔵 [PlacesAutocomplete] Metadata formatted_address:', result.data.formatted_address);
              console.log('🔵 [PlacesAutocomplete] Calling setVenueMetadata');
              setVenueMetadata(result.data);
            } else {
              console.log('🔵 [PlacesAutocomplete] No metadata result');
              setVenueMetadata(null);
            }
          })
          .catch((error) => {
            console.error('🔴 [PlacesAutocomplete] Error fetching place details:', error);
            setVenueMetadata(null);
          });
      } else {
        console.log('🔵 [PlacesAutocomplete] Not a venue type, clearing venue metadata');
        // For non-venue types, clear the venue metadata
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
    if (types.includes('establishment') && locationBias) {
      // For venue searches, include the wedding location in the search
      // This is more reliable than location bias
      searchInput = `${inputValue} wedding venue`;
    }

    const request: any = {
      input: searchInput,
      types: types,
      sessionToken: sessionToken.current,
    };

    // Only use location bias for non-venue searches (like city selection)
    if (locationBias && !types.includes('establishment')) {
      request.locationBias = `circle:${locationBias.radius || 50000}@${locationBias.lat},${locationBias.lng}`;

    }

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
    console.log('🟡 [PlacesAutocomplete] handleInputChange called with:', inputValue);
    
    // Always call onChange when user types
    console.log('🟡 [PlacesAutocomplete] Calling onChange with:', inputValue);
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
        onBlur={(e) => {
          // Add a small delay to allow click on suggestion to complete first
          setTimeout(() => {
            if (onBlur) onBlur();
          }, 150);
        }}
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
              {suggestion.description}
              <span className="text-xs text-gray-500 ml-2">
                {suggestion.types?.includes('street_address') ? 'Address' :
                 suggestion.types?.includes('premise') ? 'Venue' :
                 suggestion.types?.includes('establishment') ? 'Venue' :
                 suggestion.types?.includes('point_of_interest') ? 'Venue' :
                 suggestion.types?.includes('locality') ? 'City' :
                 suggestion.types?.includes('administrative_area_level_1') ? 'State' :
                 suggestion.types?.includes('country') ? 'Country' : 'Location'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </div>
  );
} 