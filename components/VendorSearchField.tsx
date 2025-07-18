import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import debounce from 'lodash.debounce';
import ReactDOM from 'react-dom';

interface VendorSearchFieldProps {
  value?: any;
  onChange: (vendor: any) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  categories?: string[];
  location?: string;
}

export default function VendorSearchField({ 
  value, 
  onChange, 
  onClear, 
  placeholder = "Search for a vendor...",
  disabled = false,
  categories = ['restaurant'],
  location = 'United States',
}: VendorSearchFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [vendorSelected, setVendorSelected] = useState(false);

  // Debounced search function
  const debouncedSearch = useRef(
    debounce(async (term: string) => {
      console.log('VendorSearchField: Debounced search triggered with term:', term);
      if (!term.trim() || term.length < 2) {
        console.log('VendorSearchField: Search term too short, clearing results');
        setResults([]);
        setLoading(false);
        return;
      }

      console.log('VendorSearchField: Making API call with categories:', categories, 'location:', location);
      setLoading(true);
      try {
        const response = await fetch('/api/google-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: categories[0] || 'establishment', // Use first category or fallback to establishment
            location,
            searchTerm: term,
            maxResults: 5
          })
        });

        const data = await response.json();
        console.log('VendorSearchField: Search API response:', data);
        if (data.results) {
          console.log('VendorSearchField: Setting results:', data.results.length, 'vendors');
          setResults(data.results);
        } else {
          console.log('VendorSearchField: No results in response');
          setResults([]);
        }
      } catch (error) {
        console.error('VendorSearchField: Error searching vendors:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300)
  ).current;

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    } else {
      setResults([]);
    }
  }, [searchTerm, debouncedSearch]);

  // Re-run search if location or categories change and there is a search term
  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    }
  }, [location, JSON.stringify(categories)]);

  useEffect(() => {
    console.log('VendorSearchField: value prop received:', value);
    console.log('VendorSearchField: current searchTerm:', searchTerm);
    console.log('VendorSearchField: current vendorSelected:', vendorSelected);
    
    // Set initial search term if value is provided
    if (value?.name && !searchTerm) {
      console.log('VendorSearchField: Setting search term and marking as selected');
      setSearchTerm(value.name);
      setVendorSelected(true); // Mark as selected when pre-populated
    }
  }, [value, searchTerm]);

  // Position dropdown using portal
  useEffect(() => {
    if (showResults && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [showResults, inputRef.current]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    console.log('VendorSearchField: Input changed to:', term);
    setSearchTerm(term);
    setShowResults(true);
    setSelectedIndex(-1);
    
    if (!term) {
      setResults([]);
      if (onClear) onClear();
    }
  };

  const handleVendorSelect = async (vendor: any) => {
    // Fetch additional details including website
    try {
      const response = await fetch(`/api/google-place-details?placeId=${vendor.place_id}`);
      const details = await response.json();
      
      if (details.result) {
        // Merge the details with the vendor data
        const enrichedVendor = {
          ...vendor,
          website: details.result.website || vendor.website,
          formatted_phone_number: details.result.formatted_phone_number || vendor.formatted_phone_number,
          international_phone_number: details.result.international_phone_number || vendor.international_phone_number
        };
        onChange(enrichedVendor);
      } else {
        onChange(vendor);
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      onChange(vendor);
    }
    
    setSearchTerm(vendor.name);
    setShowResults(false);
    setResults([]);
    setSelectedIndex(-1);
    setVendorSelected(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleVendorSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    setVendorSelected(false);
    if (onClear) onClear();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getVendorCategory = (vendor: any): string => {
    if (vendor.types && Array.isArray(vendor.types)) {
      const typeToCategory: Record<string, string> = {
        'florist': 'Florist',
        'jewelry_store': 'Jewelry',
        'bakery': 'Bakery',
        'restaurant': 'Reception Venue',
        'hair_care': 'Hair & Beauty',
        'photographer': 'Photographer',
        'videographer': 'Videographer',
        'clothing_store': 'Bridal Salon',
        'beauty_salon': 'Beauty Salon',
        'spa': 'Spa',
        'dj': 'DJ',
        'band': 'Band',
        'wedding_planner': 'Wedding Planner',
        'caterer': 'Catering',
        'car_rental': 'Car Rental',
        'travel_agency': 'Travel Agency',
        'officiant': 'Officiant',
        'suit_rental': 'Suit/Tux Rental',
        'makeup_artist': 'Makeup Artist',
        'stationery': 'Stationery',
        'rentals': 'Rentals',
        'favors': 'Favors'
      };
      
      for (const type of vendor.types) {
        if (typeToCategory[type]) {
          return typeToCategory[type];
        }
      }
    }
    return 'Vendor';
  };

  return (
    <div className="relative">
      {console.log('VendorSearchField: Rendering search field with searchTerm:', searchTerm, 'showResults:', showResults, 'results.length:', results.length)}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            console.log('VendorSearchField: Input focused, vendorSelected:', vendorSelected);
            if (!vendorSelected) {
              setShowResults(true);
            }
          }}
          disabled={disabled}
          className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] disabled:bg-[#F3F2F0] disabled:cursor-not-allowed pl-10 pr-10"
          placeholder={placeholder}
        />
        {searchTerm && !disabled && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (results.length > 0 || loading) && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          ref={resultsRef}
          style={dropdownStyle}
          className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Searching vendors...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((vendor, index) => (
                <button
                  key={vendor.place_id}
                  onClick={() => handleVendorSelect(vendor)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                    index === selectedIndex ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {vendor.name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{vendor.formatted_address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {getVendorCategory(vendor)}
                      </span>
                      {vendor.rating && (
                        <span className="text-yellow-600">
                          ★ {vendor.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No vendors found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          ) : null}
        </div>,
        document.body
      )}

      {/* Selected Vendor Display */}
      {(() => {
        console.log('VendorSearchField: Checking selected vendor display:', { value: !!value, vendorSelected, shouldShow: value && vendorSelected });
        return value && vendorSelected;
      })() && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-[#AB9C95] overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-playfair text-[#332B42]">{value.name}</h4>
            <button
              type="button"
              onClick={() => {
                if (onClear) onClear();
                setSearchTerm('');
                setVendorSelected(false);
              }}
              className="text-[#364257] hover:text-[#A85C36] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-sm text-[#364257] mb-1">{value.formatted_address}</p>
              {value.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="font-medium">{value.rating}</span>
                  {value.user_ratings_total && (
                    <span className="text-xs text-[#364257]">({value.user_ratings_total} Google reviews)</span>
                  )}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                {value.website && (
                  <a
                    href={value.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Visit Website
                  </a>
                )}
                {value.url && (
                  <a
                    href={value.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-600 hover:underline"
                  >
                    View on Google Maps
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 