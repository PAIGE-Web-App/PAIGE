"use client";

import { useEffect } from 'react';
import usePlacesAutocomplete from 'use-places-autocomplete';

export default function PlacesAutocompleteInput({ value, onChange, setVenueMetadata, setSelectedLocationType, placeholder, types = ['geocode'], disabled = false }: { value: string; onChange: (val: string) => void; setVenueMetadata: (venue: any | null) => void; setSelectedLocationType: (type: string | null) => void; placeholder: string; types?: string[]; disabled?: boolean; }) {
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types,
    },
    debounce: 300,
  });

  // Sync internal state with parent state
  useEffect(() => {
    if (value !== inputValue) {
      setValue(value, false);
    }
  }, [value, inputValue, setValue]);

  const handleSelect = (suggestion: any) => () => {
    setValue(suggestion.description, false);
    onChange(suggestion.description);
    clearSuggestions();

    const { place_id, types } = suggestion;

    const allowedTypes = ['locality', 'administrative_area_level_1', 'country'];
    const foundType = types.find((type: string) => allowedTypes.includes(type)) || null;
    setSelectedLocationType(foundType);

    if (setVenueMetadata) {
      const venueTypes = ['street_address', 'premise', 'establishment', 'point_of_interest'];
      if (types.some((type: string) => venueTypes.includes(type))) {
        const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
        placesService.getDetails({ placeId: place_id, fields: ['name', 'formatted_address', 'geometry', 'place_id', 'photos', 'rating', 'user_ratings_total', 'types', 'url'] }, (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            setVenueMetadata(place);
          } else {
            setVenueMetadata(null);
          }
        });
      } else {
        setVenueMetadata(null);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      <input
        value={inputValue}
        onChange={handleInputChange}
        disabled={disabled || !ready}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded border-[#AB9C95] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] appearance-none ${disabled ? 'bg-[#F3F2F0] text-[#AB9C95] cursor-not-allowed' : 'bg-white text-[#332B42]'}`}
      />
      {status === "OK" && data.length > 0 && !disabled && (
        <ul className="absolute z-10 bg-white border border-[#AB9C95] rounded mt-1 w-full max-h-48 overflow-y-auto shadow-lg">
          {data.map((suggestion) => (
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
    </div>
  );
} 