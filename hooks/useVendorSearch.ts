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
    category: searchParams?.get('category') || 'venue',
    location: searchParams?.get('location') || 'Dallas, TX',
    priceRange: {
      min: searchParams?.get('minprice') || '',
      max: searchParams?.get('maxprice') || ''
    },
    rating: parseFloat(searchParams?.get('rating') || '0'),
    distance: parseInt(searchParams?.get('distance') || '25')
  });

  // Debounced search function
  const debouncedSearchRef = useRef<any>(null);
  
  // Initialize the debounced search function
  useEffect(() => {
    debouncedSearchRef.current = debounce(async (params: VendorSearchParams) => {
      console.log('Starting vendor search with params:', params);
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

        console.log('Fetching vendors with API params:', apiParams);

        const response = await fetch('/api/google-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiParams),
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.error) {
            console.error('API returned error:', data.error);
            showErrorToast(data.error);
            setVendors([]);
          } else if (Array.isArray(data.results) && data.results.length > 0) {
            console.log(`Successfully loaded ${data.results.length} vendors`);
            
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
              console.log('Enhanced vendors with images and basic geometry data');
            } catch (error) {
              console.error('Error enhancing vendors:', error);
              setVendors(data.results);
            }
          } else {
            console.log('No vendors found in response');
            setVendors([]);
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('API request failed:', errorData);
          showErrorToast(errorData.error || 'Failed to load vendors');
          setVendors([]);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
        showErrorToast('Failed to load vendors');
        setVendors([]);
      } finally {
        setLoading(false);
      }
    }, 1000);

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

  // Initial search on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearchRef.current) {
        console.log('Running initial search with:', searchParamsState);
        debouncedSearchRef.current(searchParamsState);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []); // Only run once on mount

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
