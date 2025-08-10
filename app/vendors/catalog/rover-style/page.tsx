"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Camera, 
  Flower, 
  Utensils, 
  Music, 
  Cake, 
  Gem, 
  Scissors, 
  Sparkles, 
  Heart, 
  Car, 
  Plane, 
  Calendar, 
  User, 
  Briefcase, 
  Palette, 
  FileText, 
  Gift, 
  Mic,
  MapPin,
  Star,
  Phone,
  Mail,
  Globe,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Map,
  List
} from 'lucide-react';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useCustomToast } from '@/hooks/useCustomToast';
import { enhanceVendorsWithImages } from '@/utils/vendorImageUtils';
import Breadcrumb from '@/components/Breadcrumb';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import VendorCardRoverStyle from '@/components/VendorCardRoverStyle';
import VendorContactModal from '@/components/VendorContactModal';
import FlagVendorModal from '@/components/FlagVendorModal';
import debounce from 'lodash.debounce';
import VendorMap from '@/components/VendorMap';

const CATEGORIES = [
  { value: 'venue', label: 'Venues', singular: 'Venue', icon: Building2 },
  { value: 'photographer', label: 'Photographers', singular: 'Photographer', icon: Camera },
  { value: 'florist', label: 'Florists', singular: 'Florist', icon: Flower },
  { value: 'caterer', label: 'Catering', singular: 'Caterer', icon: Utensils },
  { value: 'dj', label: 'DJs', singular: 'DJ', icon: Music },
  { value: 'bakery', label: 'Bakeries & Cakes', singular: 'Baker', icon: Cake },
  { value: 'jewelry_store', label: 'Jewelers', singular: 'Jeweler', icon: Gem },
  { value: 'hair_care', label: 'Hair & Beauty', singular: 'Hair Stylist', icon: Scissors },
  { value: 'clothing_store', label: 'Bridal Salons', singular: 'Dress Shop', icon: Sparkles },
  { value: 'beauty_salon', label: 'Beauty Salons', singular: 'Beauty Salon', icon: Sparkles },
  { value: 'spa', label: 'Spas', singular: 'Spa', icon: Heart },
  { value: 'car_rental', label: 'Car Rentals', singular: 'Car Rental', icon: Car },
  { value: 'travel_agency', label: 'Travel Agencies', singular: 'Travel Agency', icon: Plane },
  { value: 'wedding_planner', label: 'Wedding Planners', singular: 'Wedding Planner', icon: Calendar },
  { value: 'officiant', label: 'Officiants', singular: 'Officiant', icon: User },
  { value: 'suit_rental', label: 'Suit & Tux Rentals', singular: 'Suit & Tux Rental', icon: Briefcase },
  { value: 'makeup_artist', label: 'Makeup Artists', singular: 'Makeup Artist', icon: Palette },
  { value: 'stationery', label: 'Stationery & Invitations', singular: 'Stationery', icon: FileText },
  { value: 'rentals', label: 'Event Rentals', singular: 'Event Rental', icon: Briefcase },
  { value: 'favors', label: 'Wedding Favors', singular: 'Wedding Favor', icon: Gift },
  { value: 'band', label: 'Bands', singular: 'Musician', icon: Mic },
];

// Skeleton component for loading state
const VendorCardSkeleton = () => (
  <div className="bg-white border border-[#AB9C95] rounded-[5px] p-4 animate-pulse">
    <div className="flex gap-4">
      {/* Left: Image skeleton */}
      <div className="flex-shrink-0">
        <div className="w-24 h-24 bg-[#F3F2F0] rounded-[5px]" />
      </div>
      
      {/* Right: Content skeleton */}
      <div className="flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="h-5 bg-[#F3F2F0] rounded w-3/4 mb-2" />
            <div className="h-4 bg-[#F3F2F0] rounded w-1/2" />
          </div>
          <div className="flex gap-2 ml-2">
            <div className="w-8 h-8 bg-[#F3F2F0] rounded-full" />
            <div className="w-8 h-8 bg-[#F3F2F0] rounded-full" />
          </div>
        </div>
        
        {/* Category and Price */}
        <div className="flex gap-3 mb-3">
          <div className="h-6 bg-[#F3F2F0] rounded w-20" />
          <div className="h-6 bg-[#F3F2F0] rounded w-12" />
        </div>
        
        {/* Rating */}
        <div className="flex gap-2 mb-3">
          <div className="h-4 bg-[#F3F2F0] rounded w-16" />
          <div className="h-4 bg-[#F3F2F0] rounded w-24" />
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <div className="h-8 bg-[#F3F2F0] rounded w-20" />
          <div className="h-8 bg-[#F3F2F0] rounded w-16" />
          <div className="h-8 bg-[#F3F2F0] rounded w-20" />
        </div>
      </div>
    </div>
  </div>
);

// Filter component for the left sidebar
const VendorFilters = ({ 
  category, 
  setCategory, 
  location, 
  setLocation, 
  priceRange, 
  setPriceRange,
  rating,
  setRating,
  distance,
  setDistance,
  expandedFilters,
  setExpandedFilters,
  onSearch
}) => {
  const { weddingLocation } = useUserProfileData();
  
  return (
    <div className="bg-white border border-[#AB9C95] rounded-[5px] p-4 h-full">
              <h5 className="h5 mb-4">Search Filters</h5>
      
      {/* Service Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#332B42] mb-2">
          Service Type
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border border-[#AB9C95] rounded-[5px] text-[#332B42] bg-white"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#332B42] mb-2">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter city, state, or zip"
          className="w-full p-2 border border-[#AB9C95] rounded-[5px] text-[#332B42]"
        />
        <a
          href="/settings?tab=wedding&highlight=weddingLocation"
          className="text-xs text-[#A85C36] underline mt-1 inline-block"
        >
          Update default location
        </a>
      </div>

      {/* Distance */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[#332B42]">
            Distance
          </label>
          <button
            onClick={() => setExpandedFilters(prev => ({ ...prev, distance: !prev.distance }))}
            className="text-[#A85C36] hover:text-[#784528]"
          >
            {expandedFilters.distance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {expandedFilters.distance && (
          <div className="space-y-2">
            <select
              value={distance}
              onChange={(e) => setDistance(parseInt(e.target.value))}
              className="w-full p-2 border border-[#AB9C95] rounded-[5px] text-[#332B42] bg-white"
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={25}>25 miles</option>
              <option value={50}>50 miles</option>
              <option value={100}>100 miles</option>
            </select>
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[#332B42]">
            Price Range
          </label>
          <button
            onClick={() => setExpandedFilters(prev => ({ ...prev, price: !prev.price }))}
            className="text-[#A85C36] hover:text-[#784528]"
          >
            {expandedFilters.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {expandedFilters.price && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                className="flex-1 p-2 border border-[#AB9C95] rounded-[5px] text-[#332B42]"
              />
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                className="flex-1 p-2 border border-[#AB9C95] rounded-[5px] text-[#332B42]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Rating Filter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[#332B42]">
            Minimum Rating
          </label>
          <button
            onClick={() => setExpandedFilters(prev => ({ ...prev, rating: !prev.rating }))}
            className="text-[#A85C36] hover:text-[#784528]"
          >
            {expandedFilters.rating ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {expandedFilters.rating && (
          <div className="space-y-2">
            {[4, 4.5, 5].map(r => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  value={r}
                  checked={rating === r}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="text-[#A85C36]"
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm text-[#332B42]">{r}+</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={i < r ? "text-yellow-400 fill-current" : "text-gray-300"}
                      />
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Search Button */}
      <button
        onClick={() => {
          if (category && location && onSearch) {
            onSearch({ category, location, priceRange, rating, distance });
          }
        }}
        className="w-full p-3 text-sm font-medium text-white bg-[#A85C36] border border-[#A85C36] rounded-[5px] hover:bg-[#784528] hover:border-[#784528] transition-colors mb-3"
      >
        Search Vendors
      </button>

      {/* Reset Filters */}
      <button
        onClick={() => {
          setCategory(CATEGORIES[0].value);
          setLocation(weddingLocation || 'Dallas, TX');
          setPriceRange({ min: '', max: '' });
          setRating(0);
          setDistance(25);
        }}
        className="w-full p-2 text-sm text-[#A85C36] border border-[#A85C36] rounded-[5px] hover:bg-[#A85C36] hover:text-white transition-colors"
      >
        Reset all filters
      </button>
    </div>
  );
};

// Map component placeholder
const VendorMapPlaceholder = ({ vendors, selectedVendor, onVendorSelect }) => {
  return (
    <div className="bg-white border border-[#AB9C95] rounded-[5px] h-full min-h-[600px] flex flex-col">
      <div className="p-4 border-b border-[#AB9C95] flex items-center justify-between">
        <h5 className="h5">Map View</h5>
        <button className="text-[#A85C36] hover:text-[#784528] text-sm">
          Enlarge map
        </button>
      </div>
      <div className="flex-1 bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-center text-[#AB9C95]">
          <Map className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Map integration coming soon</p>
          <p className="text-xs mt-2">{vendors.length} vendors in this area</p>
        </div>
      </div>
    </div>
  );
};

export default function RoverStyleVendorSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // Get user's wedding location from profile data
  const { weddingLocation } = useUserProfileData();
  
  // State management
  const [category, setCategory] = useState(searchParams?.get('category') || CATEGORIES[0].value);
  const [location, setLocation] = useState(searchParams?.get('location') || weddingLocation || 'Dallas, TX');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [rating, setRating] = useState(0);
  const [distance, setDistance] = useState(25); // Default distance
  const [expandedFilters, setExpandedFilters] = useState({ price: false, rating: false, distance: false });
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [hoveredVendor, setHoveredVendor] = useState<any>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);

  // Debounced search function - use useRef to maintain stable reference
  const debouncedSearchRef = useRef<any>(null);
  
  // Initialize the debounced search function once
  useEffect(() => {
    debouncedSearchRef.current = debounce(async (searchParams) => {
      console.log('Starting vendor search with params:', searchParams);
      setLoading(true);
      setCurrentPage(1); // Reset to first page on new search
      try {
        // Build API parameters similar to the existing vendor catalog
        const apiParams: any = {
          category: searchParams.category,
          location: searchParams.location,
          radius: searchParams.distance * 1609, // Convert miles to meters
        };

        // Add price range if specified
        if (searchParams.priceRange.min) {
          apiParams.minprice = parseInt(searchParams.priceRange.min);
        }
        if (searchParams.priceRange.max) {
          apiParams.maxprice = parseInt(searchParams.priceRange.max);
        }

        // Add rating filter if specified
        if (searchParams.rating) {
          apiParams.minrating = searchParams.rating;
        }

        console.log('Fetching vendors with API params:', apiParams);

        const response = await fetch('/api/google-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiParams),
        });

        console.log('API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('API response data:', data);
          
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
                // Generate sample coordinates around Dallas area for vendors without geometry
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
              setCurrentPage(1); // Reset to first page when new results arrive
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
    }, 1000); // Increased debounce time to 1 second

    // Cleanup function
    return () => {
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current.cancel();
      }
    };
  }, [showErrorToast, showSuccessToast]);

  // Manual search trigger function
  const triggerSearch = useCallback(() => {
    if (category && location && debouncedSearchRef.current) {
      debouncedSearchRef.current({ category, location, priceRange, rating, distance });
    }
  }, [category, location, priceRange, rating, distance]);

  // Memoized vendor selection handler to prevent infinite re-renders
  const handleVendorSelect = useCallback((vendor: any) => {
    setSelectedVendor(vendor);
  }, []);

  // Initial search on component mount - wait for debounced function to be ready
  useEffect(() => {
    const timer = setTimeout(() => {
      if (category && location && debouncedSearchRef.current) {
        console.log('Running initial search with:', { category, location, priceRange, rating, distance });
        debouncedSearchRef.current({ category, location, priceRange, rating, distance });
      }
    }, 100); // Small delay to ensure debounced function is initialized
    
    return () => clearTimeout(timer);
  }, [category, location, priceRange, rating, distance]); // Re-run when these change

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (location) params.set('location', location);
    if (priceRange.min) params.set('minprice', priceRange.min);
    if (priceRange.max) params.set('maxprice', priceRange.max);
    if (rating) params.set('rating', rating.toString());
    if (distance) params.set('distance', distance.toString());

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [category, location, priceRange, rating, distance]);

  // Initialize from URL parameters
  useEffect(() => {
    const urlCategory = searchParams?.get('category');
    const urlLocation = searchParams?.get('location');
    const urlMinPrice = searchParams?.get('minprice');
    const urlMaxPrice = searchParams?.get('maxprice');
    const urlRating = searchParams?.get('rating');
    const urlDistance = searchParams?.get('distance');

    if (urlCategory) setCategory(urlCategory);
    if (urlLocation) setLocation(urlLocation);
    if (urlMinPrice) setPriceRange(prev => ({ ...prev, min: urlMinPrice }));
    if (urlMaxPrice) setPriceRange(prev => ({ ...prev, max: urlMaxPrice }));
    if (urlRating) setRating(parseFloat(urlRating));
    if (urlDistance) setDistance(parseInt(urlDistance));
  }, [searchParams]);

  // Handle vendor hover events from fallback map
  useEffect(() => {
    const handleVendorHover = (event: CustomEvent) => {
      if (event.detail.isHovered) {
        setHoveredVendor(event.detail.vendor);
      } else {
        setHoveredVendor(null);
      }
    };

    window.addEventListener('vendorHover', handleVendorHover as EventListener);
    return () => {
      window.removeEventListener('vendorHover', handleVendorHover as EventListener);
    };
  }, []);

  // Batch fetch community vendor data to prevent rate limiting
  const [communityVendorData, setCommunityVendorData] = useState<Record<string, any>>({});
  
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

  const handleVendorContact = (vendor) => {
    setSelectedVendor(vendor);
    setShowContactModal(true);
  };

  const handleVendorFlag = (vendor) => {
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
          vendorId: selectedVendor.id || selectedVendor.place_id,
          reason,
          customReason
        }),
      });

      if (response.ok) {
        showSuccessToast('Vendor flagged successfully');
        setShowFlagModal(false);
        setSelectedVendor(null);
      } else {
        showErrorToast('Failed to flag vendor');
      }
    } catch (error) {
      console.error('Error flagging vendor:', error);
      showErrorToast('Failed to flag vendor');
    }
  };

  const currentCategory = CATEGORIES.find(cat => cat.value === category);

  return (
    <div className="flex flex-col h-screen bg-linen">
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={bannerLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      
      <div className="app-content-container flex-1 overflow-hidden">
          <Breadcrumb
            items={[
              { label: 'Vendor Hub', href: '/vendors' },
              { label: 'Vendor Search', href: '/vendors/catalog' },
              { label: 'Rover-Style Search', href: '/vendors/catalog/rover-style' },
              { label: currentCategory?.label || 'Search', isCurrent: true }
            ]}
          />
          


          {/* Main content area with three columns - extends to fill remaining height */}
          <div className="flex h-full gap-4 overflow-hidden">
            {/* Left Sidebar - Filters */}
            <div className="w-[320px] flex-shrink-0">
              <VendorFilters
                category={category}
                setCategory={setCategory}
                location={location}
                setLocation={setLocation}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                rating={rating}
                setRating={setRating}
                distance={distance}
                setDistance={setDistance}
                expandedFilters={expandedFilters}
                setExpandedFilters={setExpandedFilters}
                onSearch={triggerSearch}
              />
            </div>

            {/* Center - Results */}
            <div className="flex-1">
              <div className="bg-white border border-[#AB9C95] rounded-[5px] h-full flex flex-col">
                {/* Results Header */}
                <div className="p-4 border-b border-[#AB9C95] flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-4">
                    <h5 className="h5">
                      {!loading ? `${vendors.length} ${currentCategory?.label} in ${location}` : `${currentCategory?.label} in ${location}`}
                    </h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#A85C36] text-white' : 'text-[#AB9C95] hover:text-[#332B42]'}`}
                    >
                      <List size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`p-2 rounded ${viewMode === 'map' ? 'bg-[#A85C36] text-white' : 'text-[#AB9C95] hover:text-[#332B42]'}`}
                    >
                      <Map size={16} />
                    </button>
                  </div>
                </div>

                {/* Results List - Scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="p-4 space-y-4">
                    {loading ? (
                      // Loading skeletons
                      Array.from({ length: 10 }).map((_, i) => (
                        <VendorCardSkeleton key={i} />
                      ))
                    ) : vendors.length > 0 ? (
                      // Vendor results with pagination
                      vendors
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((vendor, index) => (
                          <motion.div
                            key={vendor.place_id || index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onMouseEnter={() => setHoveredVendor(vendor)}
                            onMouseLeave={() => setHoveredVendor(null)}
                          >
                            <VendorCardRoverStyle
                              vendor={vendor}
                              onContact={() => handleVendorContact(vendor)}
                              onShowFlagModal={() => handleVendorFlag(vendor)}
                              communityData={communityVendorData[vendor.place_id]}
                            />
                          </motion.div>
                        ))
                    ) : (
                      // Empty state
                      <div className="text-center py-12 text-[#AB9C95]">
                        <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No vendors found</p>
                        <p className="text-sm">Try adjusting your search filters</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pagination Controls */}
                {vendors.length > 0 && !loading && (
                  <div className="p-4 border-t border-[#AB9C95] bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-[#AB9C95]">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, vendors.length)} of {vendors.length} vendors
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded border border-[#AB9C95] text-[#AB9C95] hover:text-[#332B42] hover:border-[#332B42] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.ceil(vendors.length / itemsPerPage) }, (_, i) => i + 1)
                            .filter(page => page === 1 || page === Math.ceil(vendors.length / itemsPerPage) || (page >= currentPage - 1 && page <= currentPage + 1))
                            .map((page, index, array) => (
                              <React.Fragment key={page}>
                                {index > 0 && array[index - 1] !== page - 1 && (
                                  <span className="px-2 text-[#AB9C95]">...</span>
                                )}
                                <button
                                  onClick={() => setCurrentPage(page)}
                                  className={`px-3 py-1 rounded text-sm ${
                                    currentPage === page
                                      ? 'bg-[#A85C36] text-white'
                                      : 'text-[#AB9C95] hover:text-[#332B42] hover:bg-[#F3F2F0]'
                                  } transition-colors`}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            ))}
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(vendors.length / itemsPerPage), prev + 1))}
                          disabled={currentPage === Math.ceil(vendors.length / itemsPerPage)}
                          className="p-2 rounded border border-[#AB9C95] text-[#AB9C95] hover:text-[#332B42] hover:border-[#332B42] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Map */}
            <div className="w-[420px] flex-shrink-0">
              <VendorMap
                vendors={vendors}
                selectedVendor={selectedVendor}
                onVendorSelect={handleVendorSelect}
                hoveredVendor={hoveredVendor}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
              />
            </div>
          </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
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
        
        {showFlagModal && selectedVendor && (
          <FlagVendorModal
            vendor={selectedVendor}
            onClose={() => {
              setShowFlagModal(false);
              setSelectedVendor(null);
            }}
            onSubmit={handleFlagVendor}
          />
        )}
      </AnimatePresence>
    </div>
  );
}