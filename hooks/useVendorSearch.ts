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
    location: searchParams?.get('location') || '', // Remove hardcoded Dallas fallback
    priceRange: {
      min: searchParams?.get('minprice') || '',
      max: searchParams?.get('maxprice') || ''
    },
    rating: parseFloat(searchParams?.get('rating') || '0'),
    distance: parseInt(searchParams?.get('distance') || '25')
  });


  
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
  
  // Progressive enhancement function for images
  const enhanceVendorsProgressively = async (vendors: Vendor[]) => {
    const enhancedVendors = [...vendors];
    
    for (let i = 0; i < vendors.length; i++) {
      try {
        const enhanced = await enhanceVendorsWithImages([vendors[i]]);
        enhancedVendors[i] = enhanced[0];
        
        // Update state progressively - users see improvements as they happen
        setVendors([...enhancedVendors]);
        
        // Small delay to prevent overwhelming the UI
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error enhancing vendor ${i}:`, error);
      }
    }
  };

  // Debounced search function
  const debouncedSearchRef = useRef<any>(null);
  
  // Create a stable debounced search function using useCallback
  const debouncedSearch = useCallback(
    debounce(async (params: VendorSearchParams) => {
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

        // Use progressive loading for better UX (Phase 2 enhancement)
        const response = await fetch('/api/google-places-progressive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiParams),
        });

        if (response.ok) {
          const data = await response.json();
          
          // Check cache status from response headers
          const isFromCache = response.headers.get('X-Cache-Hit') === 'true';
          const isProgressive = response.headers.get('X-Progressive-Loading') === 'true';
          
          if (data.error) {
            console.error('❌ API returned error:', data.error);
            showErrorToast(data.error);
            setVendors([]);
          } else if (Array.isArray(data.results) && data.results.length > 0) {
            // 🚀 SHOW RESULTS IMMEDIATELY with basic geometry data
            const vendorsWithGeometry = data.results.map((vendor, index) => {
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
            
            setVendors(vendorsWithGeometry);
            setCurrentPage(1);

            // Show cache status to user for better UX
            if (isFromCache) {
              showSuccessToast(`Showing ${data.results.length} vendors from cache (refreshing in background)`);
            } else if (isProgressive) {
              showSuccessToast(`Found ${data.results.length} vendors!`);
            } else {
              showSuccessToast(`Found ${data.results.length} vendors!`);
            }

            // 🔄 Enhance images progressively in background (non-blocking)
            enhanceVendorsProgressively(vendorsWithGeometry);

          } else {
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
    }, 300),
    [showErrorToast, showSuccessToast]
  );

  // Store the stable debounced function in ref
  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
    
    return () => {
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current.cancel();
      }
    };
  }, [debouncedSearch]);



  // Update search parameters
  const setSearchParams = useCallback((params: Partial<VendorSearchParams>) => {
    setSearchParamsState(prev => ({ ...prev, ...params }));
  }, []);

  // Trigger search when parameters change
  useEffect(() => {
    if (searchParamsState.category && searchParamsState.location && debouncedSearchRef.current) {
      debouncedSearchRef.current(searchParamsState);
    }
  }, [searchParamsState]);

  // Initial search on component mount - REMOVED to prevent race condition
  // The parameter change effect above handles the initial search automatically because:
  // 1. searchParamsState initializes with default values on mount
  // 2. This triggers the useEffect above
  // 3. No duplicate search calls = consistent behavior

  // Fetch community vendor data when vendors change - optimized for pagination
  useEffect(() => {
    const fetchCommunityVendorData = async () => {
      if (vendors.length === 0) return;
      
      try {
        // 🚀 Only fetch for visible vendors (current page) instead of first 10
        const startIndex = (currentPage - 1) * 10; // Assuming 10 items per page
        const endIndex = startIndex + 10;
        const visibleVendors = vendors.slice(startIndex, endIndex);
        
        // 🔄 Fetch in parallel instead of sequentially for much faster loading
        const promises = visibleVendors.map(async (vendor) => {
          try {
            const response = await fetch(`/api/community-vendors?placeId=${vendor.place_id}`);
            if (response.ok) {
              const data = await response.json();
              return { [vendor.place_id]: data.vendor };
            }
          } catch (error) {
            console.error(`Error fetching data for ${vendor.place_id}:`, error);
          }
          return {};
        });
        
        const results = await Promise.all(promises);
        const combinedResults = results.reduce((acc, result) => ({ ...acc, ...result }), {});
        setCommunityVendorData(combinedResults);
      } catch (error) {
        console.error('Error batch fetching community vendor data:', error);
      }
    };

    fetchCommunityVendorData();
  }, [vendors, currentPage]); // Added currentPage dependency for pagination-aware fetching

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
