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
      if (!term.trim() || term.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/google-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'establishment', // Use establishment to search for any business
            location,
            searchTerm: term,
            maxResults: 5
          })
        });

        const data = await response.json();
        console.log('Vendor search response:', data);
        if (data.results) {
          setResults(data.results);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Error searching vendors:', error);
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
    // Set initial search term if value is provided
    if (value?.name && !searchTerm) {
      setSearchTerm(value.name);
    }
  }, [value]);

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
    setSearchTerm(term);
    setShowResults(true);
    setSelectedIndex(-1);
    
    if (!term) {
      setResults([]);
      if (onClear) onClear();
    }
  };

  const handleVendorSelect = (vendor: any) => {
    onChange(vendor);
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
        'restaurant': 'Venue',
        'hair_care': 'Hair & Beauty',
        'photographer': 'Photographer',
        'clothing_store': 'Bridal Salon',
        'beauty_salon': 'Beauty Salon',
        'spa': 'Spa',
        'dj': 'DJ',
        'band': 'Band',
        'wedding_planner': 'Wedding Planner',
        'caterer': 'Catering',
        'car_rental': 'Transportation',
        'travel_agency': 'Travel'
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
      {value && vendorSelected && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-[#AB9C95] overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-playfair text-[#332B42]">Selected Vendor</h4>
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
              <h6 className="text-[#3322]">{value.name}</h6>
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
              {value.url && (
                <a
                  href={value.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:opacity-80"
                >
                  View on Google Maps
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 