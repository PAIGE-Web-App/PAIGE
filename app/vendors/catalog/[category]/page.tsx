"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import VendorCatalogFilters from '@/components/VendorCatalogFilters';
import BulkContactModal from '@/components/BulkContactModal';
import FlagVendorModal from '@/components/FlagVendorModal';
import VendorContactModal from '@/components/VendorContactModal';
import { motion, AnimatePresence } from 'framer-motion';
import debounce from 'lodash.debounce';
import { useCustomToast } from '@/hooks/useCustomToast';

import VendorSearchBar from '@/components/VendorSearchBar';
import VendorCatalogHeader from '@/components/VendorCatalogHeader';
import VendorCatalogToolbar from '@/components/VendorCatalogToolbar';
import BulkContactBanner from '@/components/BulkContactBanner';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import { useConsolidatedUserData } from '@/hooks/useConsolidatedUserData';
import { usePrefetch } from '@/utils/prefetchManager';
import { deduplicatedRequest } from '@/utils/requestDeduplicator';
import { vendorCacheService } from '@/utils/vendorCacheService';

const CATEGORIES = [
  { value: 'florist', label: 'Florists', singular: 'Florist' },
  { value: 'jewelry_store', label: 'Jewelers', singular: 'Jeweler' },
  { value: 'bakery', label: 'Bakeries & Cakes', singular: 'Bakery' },
  { value: 'restaurant', label: 'Reception Venues', singular: 'Reception Venue' },
  { value: 'hair_care', label: 'Hair & Beauty', singular: 'Hair & Beauty' },
  { value: 'photographer', label: 'Photographers', singular: 'Photographer' },
  { value: 'videographer', label: 'Videographers', singular: 'Videographer' },
  { value: 'clothing_store', label: 'Bridal Salons', singular: 'Bridal Salon' },
  { value: 'beauty_salon', label: 'Beauty Salons', singular: 'Beauty Salon' },
  { value: 'spa', label: 'Spas', singular: 'Spa' },
  { value: 'dj', label: 'DJs', singular: 'DJ' },
  { value: 'band', label: 'Bands', singular: 'Band' },
  { value: 'wedding_planner', label: 'Wedding Planners', singular: 'Wedding Planner' },
  { value: 'caterer', label: 'Catering', singular: 'Caterer' },
  { value: 'car_rental', label: 'Car Rentals', singular: 'Car Rental' },
  { value: 'travel_agency', label: 'Travel Agencies', singular: 'Travel Agency' },
  { value: 'officiant', label: 'Officiants', singular: 'Officiant' },
  { value: 'suit_rental', label: 'Suit & Tux Rentals', singular: 'Suit & Tux Rental' },
  { value: 'makeup_artist', label: 'Makeup Artists', singular: 'Makeup Artist' },
  { value: 'stationery', label: 'Stationery & Invitations', singular: 'Stationery' },
  { value: 'rentals', label: 'Event Rentals', singular: 'Event Rental' },
  { value: 'favors', label: 'Wedding Favors', singular: 'Wedding Favor' },
];



// Skeleton card for loading state
function VendorCatalogCardSkeleton() {
  return (
    <div className="bg-white border rounded-[5px] p-4 flex flex-col items-start relative animate-pulse h-full min-h-[400px]">
      <div className="w-full h-32 bg-[#F3F2F0] rounded mb-2 flex items-center justify-center">
        <div className="h-20 w-20 bg-gray-200 rounded" />
      </div>
      <div className="flex-1 w-full flex flex-col justify-between">
        <div>
          <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
        </div>
      </div>
      <div className="flex gap-2 w-full mt-auto">
        <div className="h-8 bg-gray-200 rounded flex-1" />
        <div className="h-8 bg-gray-200 rounded flex-1" />
      </div>
    </div>
  );
}

// Utility functions for client-side filters
function filterByCuisine(vendors, cuisine) {
  if (!cuisine) return vendors;
  return vendors.filter(v => v.types && v.types.includes(cuisine.toLowerCase()));
}


function SuggestVenueModal({ open, onClose, categoryLabel }) {
  const [form, setForm] = useState({ name: '', address: '', website: '', description: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showSuccessToast } = useCustomToast();
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/venue-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, category: categoryLabel }),
      });
      if (res.ok) {
        setSubmitted(true);
        showSuccessToast('Thank you for your suggestion!');
        setTimeout(() => {
          onClose();
          setSubmitted(false);
          setForm({ name: '', address: '', website: '', description: '' });
        }, 1200);
      } else {
        alert('Failed to submit suggestion');
      }
    } catch (err) {
      alert('Failed to submit suggestion');
    } finally {
      setLoading(false);
    }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
        <button className="absolute top-2 right-2 text-lg" onClick={onClose}>&times;</button>
        <h3 className="text-lg font-semibold mb-4">Suggest a {categoryLabel}</h3>
        {submitted ? (
          <div className="text-green-600 font-semibold">Thank you for your suggestion!</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input name="name" value={form.name} onChange={handleChange} placeholder={`${categoryLabel} Name`} required className="border rounded px-3 py-2" />
            <input name="address" value={form.address} onChange={handleChange} placeholder="Address" required className="border rounded px-3 py-2" />
            <input name="website" value={form.website} onChange={handleChange} placeholder="Website" className="border rounded px-3 py-2" />
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="border rounded px-3 py-2" />
            <button type="submit" className="btn-primary mt-2" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
          </form>
        )}
      </div>
    </div>
  );
}

const VendorCategoryPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { category = "" } = useParams() as { category: string };
  const urlLocation = searchParams?.get('location') || '';
  const categoryObj = CATEGORIES.find(cat => cat.value === category);
  const categoryLabel = categoryObj ? categoryObj.label : category;
  const categorySingular = categoryObj ? categoryObj.singular : category;
  
  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);
  const { weddingLocation } = useConsolidatedUserData();
  
  // Initialize prefetch tracking
  const { trackSearch } = usePrefetch();

  // Use URL location or fallback to user's wedding location
  const location = urlLocation || weddingLocation || 'Dallas, TX';

  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  // Separate API and client-side filter state
  const [apiFilterValues, setApiFilterValues] = useState<any>({});
  const [clientFilterValues, setClientFilterValues] = useState<any>({});
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [flaggedVendorIds, setFlaggedVendorIds] = useState<string[]>([]);
  const [removingVendorIds, setRemovingVendorIds] = useState<string[]>([]);
  const [bulkContactMode, setBulkContactMode] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]);
  const [showBulkContactModal, setShowBulkContactModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const { showSuccessToast } = useCustomToast();

  useEffect(() => {
    fetch('/api/flag-vendor')
      .then(res => res.json())
      .then(data => {
        if (data.flagged && Array.isArray(data.flagged)) {
          const flaggedIds = data.flagged.map(f => f.vendorId);
          setFlaggedVendorIds(flaggedIds);
        }
      })
      .catch(error => {
        console.error('Error loading flagged vendors:', error);
      });
  }, []);

  // Debounced API fetch
  const debouncedFetchVendors = useRef(
    debounce((args) => {
      fetchVendors(false, args);
    }, 400)
  ).current;

  // Handle filter change
  const handleFilterChange = (key, value) => {
    // Define which filters are API-backed
    const apiKeys = ['price', 'distance', 'rating', 'openNow'];
    if (apiKeys.includes(key)) {
      setApiFilterValues(prev => {
        const next = { ...prev, [key]: value };
        debouncedFetchVendors(next);
        return next;
      });
    } else {
      setClientFilterValues(prev => ({ ...prev, [key]: value }));
    }
  };

  // Helper: extract supported API filters
  function getApiFilters(filterValues) {
    const apiFilters: Record<string, any> = {};
    if (filterValues.price) {
      // Google expects price as minprice/maxprice (0-4)
      const priceMap = { '$': 0, '$$': 1, '$$$': 2, '$$$$': 3 };
      apiFilters.minprice = priceMap[filterValues.price];
      apiFilters.maxprice = priceMap[filterValues.price];
    }
    if (filterValues.rating && filterValues.rating !== 'Any') {
      apiFilters.minrating = parseFloat(filterValues.rating);
    }
    if (filterValues.distance) {
      apiFilters.radius = Number(filterValues.distance) * 1609; // miles to meters
    }
    if (filterValues.openNow) {
      apiFilters.opennow = true;
    }
    // Add more as needed
    return apiFilters;
  }

  // Fetch vendors (API filters only)
  const fetchVendors = useCallback(async (isNextPage = false, filterValuesArg = apiFilterValues) => {
    if (!category || !location) {
      setVendors([]);
      return;
    }
    if (isNextPage && !nextPageToken) return;
    if (isNextPage) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      // For pagination, still use the original API call
      if (isNextPage) {
        const apiFilters = getApiFilters(filterValuesArg);
        const body = { category, location, nextPageToken, ...apiFilters };
        const data = await deduplicatedRequest.post('/api/google-places-optimized', body, {
          cache: true,
          cacheTTL: 5 * 60 * 1000 // 5 minutes cache
        });
        if (data.error) {
          setError(data.error);
          setVendors([]);
        } else if (Array.isArray(data.results) && data.results.length > 0) {
          setVendors(prev => {
            let newVendors = [...prev, ...data.results.filter(v => !prev.some(p => p.place_id === v.place_id))];
            return newVendors;
          });
          setNextPageToken(data.next_page_token || null);
        }
      } else {
        // For initial load, use vendor cache service to prevent rate limiting
        const vendors = await vendorCacheService.getVendors(category, location);
        if (vendors && vendors.length > 0) {
          setVendors(vendors);
          setNextPageToken(null); // Reset pagination for cached results
        } else {
          setVendors([]);
          setNextPageToken(null);
        }
      }
    } catch (err) {
      setError('Failed to load vendors');
      if (!isNextPage) setVendors([]);
    } finally {
      if (isNextPage) setLoadingMore(false);
      else setLoading(false);
    }
  }, [category, location, nextPageToken, apiFilterValues]);

  // Refetch vendors when API filters change
  useEffect(() => {
    setNextPageToken(null);
    // Clear cache when category or location changes to ensure fresh data
    vendorCacheService.clearCache();
    debouncedFetchVendors(apiFilterValues);
    // eslint-disable-next-line
  }, [category, location, apiFilterValues]);

  // Infinite scroll observer
  useEffect(() => {
    if (!nextPageToken || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new window.IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        fetchVendors(true);
      }
    });
    if (loadMoreRef.current) {
      observer.current.observe(loadMoreRef.current);
    }
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [nextPageToken, loadingMore, fetchVendors]);

  // Handle flagged vendor removal
  const handleVendorFlagged = (vendorId) => {
    setRemovingVendorIds(prev => [...prev, vendorId]);
    
    // Show toast
    showSuccessToast('The vendor has been removed from your list and will be reviewed. Thank you for flagging!');
    
    // Add to flagged vendors after animation completes
    setTimeout(() => {
      setFlaggedVendorIds(prev => [...prev, vendorId]);
      setRemovingVendorIds(prev => prev.filter(id => id !== vendorId));
    }, 400); // Faster animation - 400ms
  };

  // Handle bulk contact mode toggle
  const handleBulkContactToggle = () => {
    setBulkContactMode(!bulkContactMode);
    if (bulkContactMode) {
      setSelectedVendors([]); // Clear selections when exiting bulk mode
    }
  };

  // Handle vendor selection for bulk contact
  const handleVendorSelection = (vendorId) => {
    setSelectedVendors(prev => {
      if (prev.includes(vendorId)) {
        return prev.filter(id => id !== vendorId);
      } else {
        return [...prev, vendorId];
      }
    });
  };

  // Handle bulk contact submission
  const handleBulkContact = () => {
    if (selectedVendors.length === 0) return;
    
    // Get the selected vendor objects
    const selectedVendorObjects = clientFilteredVendors.filter(vendor => 
      selectedVendors.includes(vendor.id)
    );
    
    setShowBulkContactModal(true);
  };

  // Handle bulk contact completion
  const handleBulkContactComplete = () => {
    // Refresh the page or show a message that contacts were added
    showSuccessToast('Vendors have been added to your contacts! You can view them in the Vendors section.');
  };

  // Search function - uses smart search strategy to avoid rate limits
  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      console.log(`🔍 Searching for "${term}"...`);
      
      // First, try searching within the cached vendors (fast, no API call)
      const cachedVendors = await vendorCacheService.getVendors(category, location);
      const searchLower = term.toLowerCase().trim();
      
      const cachedResults = cachedVendors.filter(vendor => {
        const nameMatch = vendor.name.toLowerCase().includes(searchLower);
        const addressMatch = vendor.formatted_address && vendor.formatted_address.toLowerCase().includes(searchLower);
        const typeMatch = vendor.types && vendor.types.some((type: string) => type.toLowerCase().includes(searchLower));
        return nameMatch || addressMatch || typeMatch;
      });
      
      console.log(`🔍 Found ${cachedResults.length} matches in cached vendors`);
      
      // If we found good results in cache, use them
      if (cachedResults.length >= 3) {
        console.log(`✅ Using cached results (${cachedResults.length} matches)`);
        setSearchResults(cachedResults);
        return;
      }
      
      // If cache results are insufficient, try API search with longer debounce
      console.log(`🔍 Cache results insufficient, trying API search...`);
      
      // Use a longer delay for API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const apiFilters = getApiFilters(apiFilterValues);
      const body = { 
        category, 
        location, 
        searchTerm: term,
        ...apiFilters 
      };
      
      const data = await deduplicatedRequest.post('/api/google-places-optimized', body, {
        cache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minutes cache for search results
      });
      
      if (data.error) {
        console.error('API search error:', data.error);
        // Fall back to cached results even if fewer
        setSearchResults(cachedResults);
      } else if (Array.isArray(data.results) && data.results.length > 0) {
        console.log(`🎯 API search found ${data.results.length} vendors for "${term}"`);
        setSearchResults(data.results);
      } else {
        console.log(`🎯 No API results, using cached results`);
        setSearchResults(cachedResults);
      }
    } catch (error) {
      console.error('Error searching vendors:', error);
      // Fall back to cached search
      try {
        const cachedVendors = await vendorCacheService.getVendors(category, location);
        const searchLower = term.toLowerCase().trim();
        const cachedResults = cachedVendors.filter(vendor => {
          const nameMatch = vendor.name.toLowerCase().includes(searchLower);
          const addressMatch = vendor.formatted_address && vendor.formatted_address.toLowerCase().includes(searchLower);
          const typeMatch = vendor.types && vendor.types.some((type: string) => type.toLowerCase().includes(searchLower));
          return nameMatch || addressMatch || typeMatch;
        });
        setSearchResults(cachedResults);
      } catch (fallbackError) {
        console.error('Fallback search failed:', fallbackError);
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [category, location, apiFilterValues]);

  // Debounced search with longer delay to prevent rate limiting
  const debouncedSearch = useRef(
    debounce((term: string) => {
      handleSearch(term);
    }, 800) // Increased from 300ms to 800ms
  ).current;

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    console.log(`🔍 Search input changed to: "${term}"`);
    setSearchTerm(term);
    
    if (term.trim() && term.length >= 2) {
      console.log(`🔍 Triggering debounced search for: "${term}"`);
      debouncedSearch(term);
      
      // Track search for prefetching
      trackSearch(term);
    } else if (!term.trim()) {
      console.log(`🔍 Clearing search results`);
      setSearchResults([]);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    // Clear search cache to ensure fresh results when searching again
    vendorCacheService.clearCache();
    console.log('🧹 Search cleared, cache cleared');
  };

  // Modal handlers
  const handleShowContactModal = (vendor: any) => {
    setSelectedVendor(vendor);
    setShowContactModal(true);
  };

  const handleShowFlagModal = (vendor: any) => {
    setSelectedVendor(vendor);
    setShowFlagModal(true);
  };

  const handleFlagVendor = async (reason: string, customReason?: string) => {
    if (!selectedVendor) return;
    
    try {
      const response = await fetch('/api/flag-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vendorId: selectedVendor.id,
          reason,
          customReason
        }),
      });
      
      if (response.ok) {
        setFlaggedVendorIds(prev => [...prev, selectedVendor.id]);
        setShowFlagModal(false);
        setSelectedVendor(null);
        showSuccessToast('Vendor flagged successfully');
      }
    } catch (error) {
      console.error('Error flagging vendor:', error);
    }
  };

  // Map Google Places results to VendorCatalogCard props
  const typeLabels: Record<string, string> = {
    florist: 'Florist',
    jewelry_store: 'Jeweler',
    bakery: 'Bakery',
    restaurant: 'Reception Venue',
    hair_care: 'Hair & Beauty',
    photographer: 'Photographer',
    clothing_store: 'Bridal Salon',
    beauty_salon: 'Beauty Salon',
    spa: 'Spa',
    dj: 'DJ',
    band: 'Band',
    wedding_planner: 'Wedding Planner',
    caterer: 'Caterer',
    car_rental: 'Car Rental',
    travel_agency: 'Travel Agency',
    // ...add more as needed
  };

  // Use search results when searching, otherwise use regular vendors
  const allVendors = searchResults.length > 0 ? searchResults : vendors;
  console.log(`📊 allVendors: ${allVendors.length} (searchResults: ${searchResults.length}, vendors: ${vendors.length})`);
  
  const mappedVendors = allVendors.length > 0 ? allVendors.map((vendor: any) => {
    const mainType = vendor.types?.find((type: string) => typeLabels[type]);
    const mainTypeLabel = mainType ? typeLabels[mainType] : null;
    
    // Debug: Log price_level data
    if (vendor.price_level !== undefined) {
    }
    
    return {
      id: vendor.place_id,
      name: vendor.name,
      location: vendor.formatted_address,
      rating: vendor.rating,
      reviewCount: vendor.user_ratings_total,
      image: vendor.photos && vendor.photos.length > 0
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${vendor.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        : '/Venue.png',
      price: vendor.price_level !== undefined ? '$'.repeat(vendor.price_level) : '',
      // Removed non-functional fields
      amenities: [], // Not used for now
      source: vendor.website ? { name: vendor.name, url: vendor.website } : null,
      mainTypeLabel,
      address: vendor.formatted_address,
      types: vendor.types, // Keep original types for filtering
    };
  }) : [];

  // Memoized client-side filtering (applied to mapped vendors)
  const clientFilteredVendors = useMemo(() => {
    let filtered = mappedVendors;
    console.log(`🔧 clientFilteredVendors: Starting with ${mappedVendors.length} mapped vendors`);
    
    filtered = filterByCuisine(filtered, clientFilterValues.cuisine);
    console.log(`🔧 After cuisine filter: ${filtered.length} vendors`);
    
    // Don't apply search term filtering here since it's already handled in handleSearch
    // The searchResults are already filtered, so we just use them directly
    
    // Add more client-side filters as needed
    console.log(`🔧 Final clientFilteredVendors: ${filtered.length} vendors`);
    return filtered;
  }, [mappedVendors, clientFilterValues.cuisine]);


  
  return (
    <div className="min-h-screen bg-[#F3F2F0] mobile-scroll-container">
      <style jsx global>{`
        @media (max-width: 768px) {
          html, body {
            height: 100vh;
            overflow: hidden;
          }
          .mobile-scroll-container {
            height: 100vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          .mobile-catalog-content {
            padding-left: 1rem;
            padding-right: 1rem;
            max-width: 100%;
            overflow-x: hidden;
          }
        }
      `}</style>
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={bannerLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      <div className="max-w-6xl mx-auto w-full">
        <div className={`app-content-container flex flex-col gap-4 py-8 mobile-catalog-content ${bulkContactMode ? 'pb-24' : 'pb-6'}`} style={{ minHeight: bulkContactMode ? 'calc(100vh - 80px)' : 'auto' }}>
          {/* Sticky Header and Search Area */}
          <div className="sticky top-0 z-30 bg-[#F3F2F0] pt-6 pb-6 -mx-4 px-4">
            <VendorCatalogHeader
              isSearching={isSearching}
              searchTerm={searchTerm}
              searchResults={searchResults}
              loading={loading}
              vendors={vendors}
              nextPageToken={nextPageToken}
              error={error}
              categoryLabel={categoryLabel}
              location={location}
            />
            
            <VendorCatalogToolbar
              category={category}
              filterValues={{...apiFilterValues, ...clientFilterValues}}
              onFilterChange={handleFilterChange}
              vendors={vendors}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onClearSearch={clearSearch}
              isSearching={isSearching}
              searchResults={searchResults}
              categorySingular={categorySingular}
              bulkContactMode={bulkContactMode}
              onBulkContactToggle={handleBulkContactToggle}
              onSuggestVendor={() => setShowSuggestModal(true)}
              filteredResultsCount={clientFilteredVendors.length}
            />
          </div>
          <SuggestVenueModal open={showSuggestModal} onClose={() => setShowSuggestModal(false)} categoryLabel={categorySingular} />
          {error && <div className="text-center text-red-500 py-8">{error}</div>}
          
          <BulkContactBanner isVisible={bulkContactMode} />
      

      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-stretch">
        {(() => {
          if (loading) {
            return Array.from({ length: 6 }).map((_, i) => <VendorCatalogCardSkeleton key={`loading-skeleton-${i}`} />);
          } else if (isSearching && searchTerm.trim()) {
            // Show loading state specifically for search using skeleton cards
            return (
              <>
                <div className="col-span-full text-center py-4">
                  <p className="text-gray-600">Searching for "{searchTerm}"...</p>
                  <p className="text-sm text-gray-500 mt-1">This may take a moment to find all available venues</p>
                </div>
                {Array.from({ length: 6 }).map((_, i) => <VendorCatalogCardSkeleton key={`search-skeleton-${i}`} />)}
              </>
            );
          } else if (clientFilteredVendors.length > 0) {
            return clientFilteredVendors
              .filter(vendor => {
                const vendorId = vendor.id;
                const isFlagged = flaggedVendorIds.includes(vendorId);
                const isRemoving = removingVendorIds.includes(vendorId);
                const shouldShow = vendorId && (!isFlagged || isRemoving);
                
                if (isFlagged && !isRemoving) {
                }
                
                return shouldShow;
              })
              .map((vendor, idx) => {
                const vendorId = vendor.id;
                const isRemoving = removingVendorIds.includes(vendorId);
                
                // Skip vendors that are being removed
                if (isRemoving) {
                  return null;
                }
                
                return (
                  <VendorCatalogCard
                    key={vendorId || `vendor-${idx}`}
                    vendor={vendor}
                    onContact={() => {}}
                    onFlagged={handleVendorFlagged}
                    bulkContactMode={bulkContactMode}
                    isSelected={selectedVendors.includes(vendor.id)}
                    onSelectionChange={handleVendorSelection}
                    location={location}
                    category={category}
                    onShowContactModal={handleShowContactModal}
                    onShowFlagModal={handleShowFlagModal}
                    searchTerm={searchTerm}
                  />
                );
              });
          } else {
            return (
              <div className="col-span-full text-center text-gray-500 py-8">
                {searchTerm 
                  ? (
                    <div>
                      <p>No vendors found for "{searchTerm}"</p>
                      <button 
                        onClick={clearSearch}
                        className="mt-2 text-[#A85C36] hover:underline"
                      >
                        Clear search and show all {categoryLabel}
                      </button>
                    </div>
                  ) 
                  : 'No vendors found'
                }
              </div>
            );
          }
        })()}
      </div>
      {/* Infinite scroll loader */}
      {nextPageToken && (
        <div ref={loadMoreRef} className="flex justify-center py-6">
          {loadingMore && <span>Loading more...</span>}
        </div>
      )}
      
      {/* Fixed footer for bulk contact */}
      <AnimatePresence>
        {bulkContactMode && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3
            }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#A85C36]" 
            style={{ 
              zIndex: 50, 
              height: '80px',
              boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15), 0 -2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="h-full flex items-center justify-between px-6" style={{ maxWidth: '1440px', margin: '0 auto' }}>
              <div className="text-sm font-medium text-[#332B42]">
                {selectedVendors.length} vendor{selectedVendors.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="btn-primaryinverse-large"
                  onClick={handleBulkContactToggle}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Cancel Bulk Contact
                </button>
                <button
                  className={`flex items-center gap-2 ${
                    selectedVendors.length > 0
                      ? 'btn-gradient-purple-large'
                      : 'btn-gradient-purple-large-disabled'
                  }`}
                  onClick={handleBulkContact}
                  disabled={selectedVendors.length === 0}
                  style={{ minWidth: '220px' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0L9.937 15.5Z" />
                  </svg>
                  Contact {selectedVendors.length} Vendor{selectedVendors.length !== 1 ? 's' : ''} in Bulk
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Contact Modal */}
      <BulkContactModal
        vendors={clientFilteredVendors.filter(vendor => selectedVendors.includes(vendor.id))}
        isOpen={showBulkContactModal}
        onClose={() => {
          setShowBulkContactModal(false);
          setBulkContactMode(false);
          setSelectedVendors([]);
          handleBulkContactComplete();
        }}
      />

      {/* Modals */}
      {showFlagModal && selectedVendor && (
        <FlagVendorModal
          vendor={selectedVendor}
          onClose={() => {
            setShowFlagModal(false);
            setSelectedVendor(null);
          }}
          onSubmit={handleFlagVendor}
          isSubmitting={false}
        />
      )}

      {showContactModal && selectedVendor && (
        <VendorContactModal
          vendor={selectedVendor}
          isOpen={showContactModal}
          onClose={() => {
            setShowContactModal(false);
            setSelectedVendor(null);
          }}
        />
      )}
        </div>
      </div>
    </div>
  );
};

export default VendorCategoryPage; 