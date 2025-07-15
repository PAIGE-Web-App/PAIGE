"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import VendorCatalogFilters from '@/components/VendorCatalogFilters';
import { motion, AnimatePresence } from 'framer-motion';
import debounce from 'lodash.debounce';
import { useCustomToast } from '@/hooks/useCustomToast';

const CATEGORIES = [
  { value: 'florist', label: 'Florists', singular: 'Florist' },
  { value: 'jewelry_store', label: 'Jewelers', singular: 'Jeweler' },
  { value: 'bakery', label: 'Bakeries & Cakes', singular: 'Bakery' },
  { value: 'restaurant', label: 'Reception Venues', singular: 'Reception Venue' },
  { value: 'hair_care', label: 'Hair & Beauty', singular: 'Hair & Beauty' },
  { value: 'photographer', label: 'Photographers', singular: 'Photographer' },
  { value: 'clothing_store', label: 'Bridal Salons', singular: 'Bridal Salon' },
  { value: 'beauty_salon', label: 'Beauty Salons', singular: 'Beauty Salon' },
  { value: 'spa', label: 'Spas', singular: 'Spa' },
  { value: 'dj', label: 'DJs', singular: 'DJ' },
  { value: 'band', label: 'Bands', singular: 'Band' },
  { value: 'wedding_planner', label: 'Wedding Planners', singular: 'Wedding Planner' },
  { value: 'caterer', label: 'Catering', singular: 'Caterer' },
  { value: 'car_rental', label: 'Car Rentals', singular: 'Car Rental' },
  { value: 'travel_agency', label: 'Travel Agencies', singular: 'Travel Agency' },
  // Add or remove as needed for your app
];

const MOCK_VENDORS = Array.from({ length: 6 }).map((_, i) => ({
  id: `vendor${i}`,
  name: 'The Milestone | Aubrey by Walters Wedding Estates',
  location: 'Dallas, TX',
  rating: 4.8,
  reviewCount: 129,
  image: '/public/Venue.png',
  price: '$',
  guestCapacity: '300+',
  amenities: ['Outdoor Event Space'],
  source: { name: 'The Knot', url: 'https://www.theknot.com/' },
}));

// Skeleton card for loading state
function VendorCatalogCardSkeleton() {
  return (
    <div className="bg-white border rounded-[5px] p-4 flex flex-col items-start relative animate-pulse">
      <div className="w-full h-32 bg-[#F3F2F0] rounded mb-2 flex items-center justify-center">
        <div className="h-20 w-20 bg-gray-200 rounded" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-full mt-auto" />
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
  const searchParams = useSearchParams();
  const { category = "" } = useParams();
  const location = searchParams.get('location') || '';
  const categoryObj = CATEGORIES.find(cat => cat.value === category);
  const categoryLabel = categoryObj ? categoryObj.label : category;
  const categorySingular = categoryObj ? categoryObj.singular : category;

  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  // Separate API and client-side filter state
  const [apiFilterValues, setApiFilterValues] = useState({});
  const [clientFilterValues, setClientFilterValues] = useState({});
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [flaggedVendorIds, setFlaggedVendorIds] = useState([]);
  const [removingVendorIds, setRemovingVendorIds] = useState([]);
  const [bulkContactMode, setBulkContactMode] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const { showSuccessToast } = useCustomToast();

  useEffect(() => {
    fetch('/api/flag-vendor')
      .then(res => res.json())
      .then(data => {
        console.log('Loaded flagged vendors:', data);
        if (data.flagged && Array.isArray(data.flagged)) {
          const flaggedIds = data.flagged.map(f => f.vendorId);
          console.log('Setting flagged vendor IDs:', flaggedIds);
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
    const apiFilters = {};
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
      const apiFilters = getApiFilters(filterValuesArg);
      const body = isNextPage
        ? { category, location, nextPageToken, ...apiFilters }
        : { category, location, ...apiFilters };
      const res = await fetch('/api/google-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        if (!isNextPage) setVendors([]);
      } else if (Array.isArray(data.results) && data.results.length > 0) {
        setVendors(prev => {
          let newVendors = isNextPage
            ? [...prev, ...data.results.filter(v => !prev.some(p => p.place_id === v.place_id))]
            : data.results;
          return newVendors;
        });
        setNextPageToken(data.next_page_token || null);
      } else if (!isNextPage) {
        setVendors([]);
        setNextPageToken(null);
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
    return () => observer.current && observer.current.disconnect();
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
    
    // TODO: Implement AI bulk contact logic
    console.log('Bulk contacting vendors:', selectedVendors);
    showSuccessToast(`Contacting ${selectedVendors.length} vendors...`);
    
    // Reset bulk mode after submission
    setBulkContactMode(false);
    setSelectedVendors([]);
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

  const mappedVendors = vendors.length > 0 ? vendors.map((vendor: any) => {
    const mainType = vendor.types?.find((type: string) => typeLabels[type]);
    const mainTypeLabel = mainType ? typeLabels[mainType] : null;
    
    // Debug: Log price_level data
    if (vendor.price_level !== undefined) {
      console.log(`Vendor ${vendor.name} has price_level:`, vendor.price_level);
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
      guestCapacity: '', // Google Places does not provide this
      amenities: [], // Not used for now
      source: vendor.website ? { name: vendor.name, url: vendor.website } : null,
      mainTypeLabel,
      address: vendor.formatted_address,
      types: vendor.types, // Keep original types for filtering
    };
  }) : MOCK_VENDORS;

  // Memoized client-side filtering (applied to mapped vendors)
  const clientFilteredVendors = useMemo(() => {
    let filtered = mappedVendors;
    filtered = filterByCuisine(filtered, clientFilterValues.cuisine);
    // Add more client-side filters as needed
    return filtered;
  }, [mappedVendors, clientFilterValues.cuisine]);


  
  return (
    <div className={`app-content-container flex flex-col gap-6 py-8 ${bulkContactMode ? 'pb-24' : ''}`} style={{ minHeight: bulkContactMode ? 'calc(100vh - 80px)' : 'auto' }}>
      <nav className="flex items-center text-xs text-[#A85C36] mb-4" aria-label="Breadcrumb">
        <a href="/vendors/catalog" className="hover:underline">Vendor Search</a>
        <span className="mx-2 text-[#AB9C95]">/</span>
        <span className="text-[#332B42] font-medium">{categoryLabel}</span>
      </nav>
      <h2 className="text-2xl font-playfair font-medium text-[#332B42] mb-2">
        {nextPageToken && mappedVendors.length === 20
          ? `20+ ${categoryLabel} in ${location || 'All Locations'}`
          : `${mappedVendors.length} ${categoryLabel} in ${location || 'All Locations'}`}
      </h2>
      {/* Filters and buttons in one row */}
      <div className="flex items-center justify-between mb-4 gap-4 w-full">
        <VendorCatalogFilters category={category} filterValues={{...apiFilterValues, ...clientFilterValues}} onChange={handleFilterChange} vendors={vendors} />
        <div className="flex gap-2 flex-shrink-0">
          <button
            className={`flex items-center gap-2 ${
              bulkContactMode 
                ? 'btn-primary bg-[#A85C36] text-white' 
                : 'btn-gradient-purple'
            }`}
            onClick={handleBulkContactToggle}
            style={{ whiteSpace: 'nowrap' }}
          >
            {!bulkContactMode && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0L9.937 15.5Z" />
              </svg>
            )}
            {bulkContactMode ? 'Cancel Bulk Contact' : 'Bulk Contact with AI'}
          </button>
          <button
            className="btn-primaryinverse flex-shrink-0"
            onClick={() => setShowSuggestModal(true)}
            style={{ whiteSpace: 'nowrap' }}
          >
            Suggest a {categorySingular}
          </button>
        </div>
      </div>
      <SuggestVenueModal open={showSuggestModal} onClose={() => setShowSuggestModal(false)} categoryLabel={categorySingular} />
      {error && <div className="text-center text-red-500 py-8">{error}</div>}
      
      {/* Bulk contact info banner */}
      <AnimatePresence>
        {bulkContactMode && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3
            }}
          >
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-lg shadow-lg mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0L9.937 15.5Z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm mb-1 text-white">Bulk Contact with AI</h5>
                  <p className="text-sm opacity-90 text-white">
                    Select the vendors you'd like to message all at once using AI! Once you've selected your vendors, click the Contact Vendors in Bulk button in the footer below to get in touch with multiple vendors efficiently and save time on your wedding planning.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      

      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <VendorCatalogCardSkeleton key={i} />)
          : clientFilteredVendors.length > 0 
            ? clientFilteredVendors
              .filter(vendor => {
                const vendorId = vendor.id;
                const isFlagged = flaggedVendorIds.includes(vendorId);
                const isRemoving = removingVendorIds.includes(vendorId);
                const shouldShow = vendorId && (!isFlagged || isRemoving);
                
                if (isFlagged && !isRemoving) {
                  console.log('Filtering out flagged vendor:', vendorId);
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
                  <div key={vendorId || idx}>
                    <VendorCatalogCard
                      vendor={vendor}
                      onContact={() => {}}
                      onFlagged={handleVendorFlagged}
                      bulkContactMode={bulkContactMode}
                      isSelected={selectedVendors.includes(vendor.id)}
                      onSelectionChange={handleVendorSelection}
                    />
                  </div>
                );
              })
            : <div className="col-span-full text-center text-gray-500 py-8">No vendors found</div>
        }
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0L9.937 15.5Z" />
                  </svg>
                  Contact {selectedVendors.length} Vendor{selectedVendors.length !== 1 ? 's' : ''} in Bulk
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorCategoryPage; 