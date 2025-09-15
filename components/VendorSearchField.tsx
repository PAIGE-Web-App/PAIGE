import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, MapPin, X, Star } from 'lucide-react';
import debounce from 'lodash.debounce';
import ReactDOM from 'react-dom';
import LoadingSpinner from './LoadingSpinner';
import { vendorCacheService } from '@/utils/vendorCacheService';

interface VendorSearchFieldProps {
  value?: any;
  onChange: (vendor: any) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  categories?: string[];
  location?: string;
}

const VendorSearchField = React.memo(function VendorSearchField({ 
  value, 
  onChange, 
  onClear, 
  placeholder = "Search for a vendor...",
  disabled = false,
  categories = ['restaurant'],
  location = 'United States',
}: VendorSearchFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [vendorSelected, setVendorSelected] = useState(false);
  const [initialLoad, setInitialLoad] = useState(false);

  // Load vendors using shared cache service
  const loadVendors = useCallback(async () => {
    if (initialLoad) {
      return;
    }
    
    setLoading(true);
    try {
      const vendors = await vendorCacheService.getVendors(
        categories[0] || 'restaurant',
        location
      );
      
      if (vendors && vendors.length > 0) {
        setAllVendors(vendors);
        setInitialLoad(true);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  }, [categories, location, initialLoad]);

  // Client-side filtering function (like catalog)
  const filterVendors = useCallback((term: string) => {
    if (!term.trim() || term.length < 2) {
      setResults([]);
      return;
    }

    if (allVendors.length === 0) {
      setResults([]);
      return;
    }

    const searchLower = term.toLowerCase().trim();
    const filtered = allVendors.filter(vendor => 
      vendor.name.toLowerCase().includes(searchLower) ||
      (vendor.formatted_address && vendor.formatted_address.toLowerCase().includes(searchLower)) ||
      (getVendorCategory(vendor).toLowerCase().includes(searchLower))
    );
    
    setResults(filtered.slice(0, 10)); // Limit to 10 results for dropdown
  }, [allVendors]);

  // Create a new debounced function whenever allVendors changes
  const debouncedSearch = useMemo(() => {
    return debounce((term: string) => {
      filterVendors(term);
    }, 150);
  }, [allVendors, filterVendors]);

  // Load vendors when user starts typing (lazy loading) and handle search
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 2) {
      if (!initialLoad) {
        loadVendors();
      } else if (allVendors.length > 0) {
        debouncedSearch(searchTerm);
      }
    } else {
      setResults([]);
    }
  }, [searchTerm, initialLoad, allVendors.length, loadVendors, debouncedSearch]);

  useEffect(() => {
    // Set initial search term if value is provided
    if (value?.name && !searchTerm) {
      setSearchTerm(value.name);
      setVendorSelected(true);
    }
    
    // Reset vendorSelected if value is cleared
    if (!value && vendorSelected) {
      setVendorSelected(false);
    }
  }, [value, searchTerm, vendorSelected]);

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

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showResults && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        // Check if click is on dropdown results
        const resultsElement = resultsRef.current;
        if (resultsElement && !resultsElement.contains(event.target as Node)) {
          setShowResults(false);
        }
      }
    };

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showResults]);

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

  // Highlight matching text in search results
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const getVendorCategory = (vendor: any): string => {
    if (vendor.types && Array.isArray(vendor.types)) {
      const typeToCategory: Record<string, string> = {
        // Jewelry & Accessories
        'jewelry_store': 'Jewelry',
        
        // Flowers & Decor
        'florist': 'Florist',
        
        // Food & Beverage
        'bakery': 'Baker',
        'caterer': 'Caterer',
        
        // Venues
        'restaurant': 'Venue',
        
        // Beauty & Styling
        'hair_care': 'Hair Stylist',
        'beauty_salon': 'Beauty Salon',
        'spa': 'Spa',
        'makeup_artist': 'Makeup Artist',
        
        // Photography & Video
        'photographer': 'Photographer',
        'videographer': 'Videographer',
        
        // Attire
        'clothing_store': 'Dress Shop',
        'suit_rental': 'Suit/Tux Rental',
        
        // Entertainment
        'dj': 'DJ',
        'band': 'Musician',
        
        // Planning & Services
        'wedding_planner': 'Wedding Planner',
        'officiant': 'Officiant',
        'travel_agency': 'Travel Agency',
        
        // Transportation
        'car_rental': 'Transportation',
        
        // Supplies & Extras
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
            if (searchTerm && searchTerm.length >= 2) {
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
      {showResults && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          ref={resultsRef}
          style={dropdownStyle}
          className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center">
              <LoadingSpinner size="sm" text={allVendors.length === 0 ? "Loading vendors..." : "Searching vendors..."} />
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
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {highlightText(vendor.name, searchTerm)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {getVendorCategory(vendor)}
                      </span>
                      {vendor.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span className="text-yellow-600 font-medium">{vendor.rating}</span>
                        </div>
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
});

export default VendorSearchField; 