import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCustomToast } from './useCustomToast';
import { enhanceVendorsWithImages } from '@/utils/vendorImageUtils';
import { Vendor } from '@/types/vendor';
import debounce from 'lodash.debounce';

interface VendorSearchParams {
  category: string;
  location: string;
  priceRange: { min: string; max: string };
  rating: number;
  distance: number;
}

interface UseVendorSearchReturn {
  vendors: Vendor[];
  loading: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  searchParams: VendorSearchParams;
  setSearchParams: (params: Partial<VendorSearchParams>) => void;
  communityVendorData: Record<string, any>;
}

export function useVendorSearch(): UseVendorSearchReturn {
  const searchParams = useSearchParams();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // State management
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [communityVendorData, setCommunityVendorData] = useState<Record<string, any>>({});

  // Search parameters state
  const [searchParamsState, setSearchParamsState] = useState<VendorSearchParams>({
    category: searchParams?.get('category') || 'venue', // Default to venue for wedding venues
    location: searchParams?.get('location') || 'Dallas, TX',
    priceRange: {
      min: searchParams?.get('minprice') || '',
      max: searchParams?.get('maxprice') || ''
    },
    rating: parseFloat(searchParams?.get('rating') || '0'),
    distance: parseInt(searchParams?.get('distance') || '25')
  });

  console.log('🔧 useVendorSearch initialized with:');
  console.log('🔧 searchParams from URL:', searchParams);
  console.log('🔧 searchParamsState:', searchParamsState);
  console.log('🔧 Default category:', searchParams?.get('category') || 'venue');
  
  // Sync state with URL parameters when they change
  useEffect(() => {
    const urlCategory = searchParams?.get('category');
    const urlLocation = searchParams?.get('location');
    const urlMinPrice = searchParams?.get('minprice');
    const urlMaxPrice = searchParams?.get('maxprice');
    const urlRating = searchParams?.get('rating');
    const urlDistance = searchParams?.get('distance');

    if (urlCategory || urlLocation || urlMinPrice || urlMaxPrice || urlRating || urlDistance) {
      setSearchParamsState(prev => ({
        ...prev,
        category: urlCategory || prev.category,
        location: urlLocation || prev.location,
        priceRange: {
          min: urlMinPrice || prev.priceRange.min,
          max: urlMaxPrice || prev.priceRange.max
        },
        rating: urlRating ? parseFloat(urlRating) : prev.rating,
        distance: urlDistance ? parseInt(urlDistance) : prev.distance
      }));
    }
  }, [searchParams]);
  
  // Debounced search function
  const debouncedSearchRef = useRef<any>(null);
  
  // Initialize the debounced search function
  useEffect(() => {
    console.log('🔧 Setting up debounced search function');
    debouncedSearchRef.current = debounce(async (params: VendorSearchParams) => {
      console.log('🚀 DEBOUNCED FUNCTION EXECUTING! Starting vendor search with params:', params);
      console.log('🔍 Category being sent:', params.category);
      console.log('📍 Location being sent:', params.location);
      setLoading(true);
      setCurrentPage(1); // Reset to first page on new search
      
      try {
        // Build API parameters
        const apiParams: any = {
          category: params.category,
          location: params.location,
          radius: params.distance * 1609, // Convert miles to meters
        };

        // Add price range if specified
        if (params.priceRange.min) {
          apiParams.minprice = parseInt(params.priceRange.min);
        }
        if (params.priceRange.max) {
          apiParams.maxprice = parseInt(params.priceRange.max);
        }

        // Add rating filter if specified
        if (params.rating) {
          apiParams.minrating = params.rating;
        }

        console.log('📡 Fetching vendors with API params:', apiParams);
        console.log('🌐 API endpoint: /api/google-places');

        const response = await fetch('/api/google-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiParams),
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
          const data = await response.json();
          console.log('📊 API response data:', data);
          
          if (data.error) {
            console.error('❌ API returned error:', data.error);
            showErrorToast(data.error);
            setVendors([]);
          } else if (Array.isArray(data.results) && data.results.length > 0) {
            console.log(`✅ Successfully loaded ${data.results.length} vendors`);
            
            // Enhance vendors with images
            try {
              let enhancedVendors = await enhanceVendorsWithImages(data.results);
              
              // Add basic geometry data for map functionality
              enhancedVendors = enhancedVendors.map((vendor, index) => {
                if (!vendor.geometry?.location) {
                  const dallasCenter = { lat: 32.7767, lng: -96.7970 };
                  const angle = (index * 137.5) % 360; // Golden angle for better distribution
                  const distance = 0.01 + (index % 5) * 0.005; // 0.01 to 0.035 degrees
                  const lat = dallasCenter.lat + Math.cos(angle * Math.PI / 180) * distance;
                  const lng = dallasCenter.lng + Math.sin(angle * Math.PI / 180) * distance;
                  
                  vendor.geometry = { location: { lat, lng } };
                }
                return vendor;
              });
              
              setVendors(enhancedVendors);
              setCurrentPage(1);
              console.log('🎨 Enhanced vendors with images and basic geometry data');
            } catch (error) {
              console.error('❌ Error enhancing vendors:', error);
              setVendors(data.results);
            }
          } else {
            console.log('🔍 No vendors found in response');
            setVendors([]);
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ API request failed:', errorData);
          showErrorToast(errorData.error || 'Failed to load vendors');
          setVendors([]);
        }
      } catch (error) {
        console.error('❌ Error fetching vendors:', error);
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        showErrorToast('Failed to load vendors');
        setVendors([]);
      } finally {
        setLoading(false);
      }
    }, 100); // Reduced from 1000ms to 100ms for faster response

    return () => {
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current.cancel();
      }
    };
  }, [showErrorToast, showSuccessToast]);



  // Update search parameters
  const setSearchParams = useCallback((params: Partial<VendorSearchParams>) => {
    setSearchParamsState(prev => ({ ...prev, ...params }));
  }, []);

  // Trigger search when parameters change
  useEffect(() => {
    console.log('🔄 Search effect triggered with params:', searchParamsState);
    console.log('🔄 Category in effect:', searchParamsState.category);
    console.log('🔄 Location in effect:', searchParamsState.location);
    
    if (searchParamsState.category && searchParamsState.location) {
      console.log('✅ Triggering search with valid params');
      console.log('🔧 Calling debounced search function...');
      console.log('🔧 debouncedSearchRef.current exists:', !!debouncedSearchRef.current);
      debouncedSearchRef.current(searchParamsState);
    } else {
      console.log('❌ Not triggering search - missing category or location');
      console.log('❌ Category:', searchParamsState.category);
      console.log('❌ Location:', searchParamsState.location);
    }
  }, [searchParamsState]);

  // Initial search on component mount - REMOVED to prevent race condition
  // The parameter change effect above handles the initial search automatically because:
  // 1. searchParamsState initializes with default values on mount
  // 2. This triggers the useEffect above
  // 3. No duplicate search calls = consistent behavior

  // Fetch community vendor data when vendors change
  useEffect(() => {
    const fetchCommunityVendorData = async () => {
      if (vendors.length === 0) return;
      
      try {
        console.log('Batch fetching community vendor data for', vendors.length, 'vendors...');
        
        // Create a batch request for all vendors
        const batchPromises = vendors.map(async (vendor) => {
          try {
            const response = await fetch(`/api/community-vendors?placeId=${vendor.place_id}`);
            if (response.ok) {
              const data = await response.json();
              return { placeId: vendor.place_id, data: data.vendor };
            }
            return { placeId: vendor.place_id, data: null };
          } catch (error) {
            console.error(`Error fetching data for ${vendor.place_id}:`, error);
            return { placeId: vendor.place_id, data: null };
          }
        });

        // Add a small delay between batches to prevent rate limiting
        const batchSize = 5;
        const results: Record<string, any> = {};
        
        for (let i = 0; i < batchPromises.length; i += batchSize) {
          const batch = batchPromises.slice(i, i + batchSize);
          const batchResults = await Promise.all(batch);
          
          batchResults.forEach(({ placeId, data }) => {
            if (data) {
              results[placeId] = data;
            }
          });
          
          // Small delay between batches
          if (i + batchSize < batchPromises.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        setCommunityVendorData(results);
        console.log('Community vendor data fetched for', Object.keys(results).length, 'vendors');
      } catch (error) {
        console.error('Error batch fetching community vendor data:', error);
      }
    };

    fetchCommunityVendorData();
  }, [vendors]);

  return {
    vendors,
    loading,
    currentPage,
    setCurrentPage,
    searchParams: searchParamsState,
    setSearchParams,
    communityVendorData
  };
}
