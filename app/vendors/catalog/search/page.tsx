'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import WeddingBanner from '@/components/WeddingBanner';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useCustomToast } from '@/hooks/useCustomToast';

import VendorContactModal from '@/components/VendorContactModal';
import FlagVendorModal from '@/components/FlagVendorModal';
import VendorMap from '@/components/VendorMap';
import VendorFilters from '@/components/vendor-search/VendorFilters';
import VendorSearchResults, { VendorSearchResultsRef } from '@/components/vendor-search/VendorSearchResults';
import { useVendorSearch } from '@/hooks/useVendorSearch';
import { VENDOR_CATEGORIES } from '@/constants/vendorCategories';
import { Vendor } from '@/types/vendor';

// Main component
export default function VendorSearchPage() {
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // Get user's wedding location from profile data
  const { weddingLocation } = useUserProfileData();
  
  // No redirects - this is the main search page for both mobile and desktop
  
  // Use the custom hook for vendor search
  const {
    vendors,
    loading,
    currentPage,
    setCurrentPage,
    searchParams,
    setSearchParams,
    communityVendorData
  } = useVendorSearch();

  // Local state for UI
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [hoveredVendor, setHoveredVendor] = useState<Vendor | null>(null);
  
  const [expandedFilters, setExpandedFilters] = useState({ price: false, rating: false, distance: false });
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  
  // Ref for vendor search results to enable scrolling
  const vendorSearchResultsRef = useRef<VendorSearchResultsRef>(null);

  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Vendor[]>([]);

  // Pagination
  const [itemsPerPage] = useState(10);


  // Update search params when they change
  useEffect(() => {
    const params = new URLSearchParams();
    // Always include the category in URL (defaults to 'venue' for wedding venues)
    params.set('category', searchParams.category || 'venue');
    if (searchParams.location) params.set('location', searchParams.location);
    if (searchParams.priceRange.min) params.set('minprice', searchParams.priceRange.min);
    if (searchParams.priceRange.max) params.set('maxprice', searchParams.priceRange.max);
    if (searchParams.rating) params.set('rating', searchParams.rating.toString());
    if (searchParams.distance) params.set('distance', searchParams.distance.toString());

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [searchParams]);

  // Listen for vendor hover events from the map
  useEffect(() => {
    const handleVendorHover = (event: CustomEvent) => {
      const { vendor, isHovered } = event.detail;
      if (isHovered) {
        setHoveredVendor(vendor);
      } else {
        setHoveredVendor(null);
      }
    };

    window.addEventListener('vendorHover', handleVendorHover as EventListener);
    
    return () => {
      window.removeEventListener('vendorHover', handleVendorHover as EventListener);
    };
  }, []);

  // Initialize from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category');
    const urlLocation = urlParams.get('location');
    const urlMinPrice = urlParams.get('minprice');
    const urlMaxPrice = urlParams.get('maxprice');
    const urlRating = urlParams.get('rating');
    const urlDistance = urlParams.get('distance');

    // Set category from URL or default to 'venue' for wedding venues
    if (urlCategory) {
      setSearchParams({ category: urlCategory });
    } else {
      // Set default category to 'venue' if none specified
      setSearchParams({ category: 'venue' });
    }
    
    if (urlLocation) setSearchParams({ location: urlLocation });
    if (urlMinPrice) setSearchParams({ priceRange: { ...searchParams.priceRange, min: urlMinPrice } });
    if (urlMaxPrice) setSearchParams({ priceRange: { ...searchParams.priceRange, max: urlMaxPrice } });
    if (urlRating) setSearchParams({ rating: parseFloat(urlRating) });
    if (urlDistance) setSearchParams({ distance: parseInt(urlDistance) });
  }, []);

  // Search functionality
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.trim() && term.length >= 2) {
      // Filter vendors based on search term
      const filtered = vendors.filter(vendor => 
        vendor.name?.toLowerCase().includes(term.toLowerCase()) ||
        vendor.formatted_address?.toLowerCase().includes(term.toLowerCase()) ||
        vendor.types?.some(type => type.toLowerCase().includes(term.toLowerCase()))
      );
      setSearchResults(filtered);
      setIsSearching(true);
    } else if (!term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleVendorContact = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowContactModal(true);
  };

  const handleVendorFlag = (vendor: Vendor) => {
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
          vendorId: selectedVendor.place_id,
          reason,
          customReason
        }),
      });

      if (response.ok) {
        showSuccessToast('Vendor flagged successfully');
        setShowFlagModal(false);
        setSelectedVendor(null);
        
        // Refresh vendor data to show flagged status
        // This will trigger a re-fetch of community data including flag status
        if (vendorSearchResultsRef.current) {
          // Force a refresh of the vendor list to show updated flag status
          window.dispatchEvent(new CustomEvent('vendorFlagged', { 
            detail: { vendorId: selectedVendor.place_id } 
          }));
        }
      } else {
        showErrorToast('Failed to flag vendor');
      }
    } catch (error) {
      console.error('Error flagging vendor:', error);
      showErrorToast('Failed to flag vendor');
    }
  };

  const currentCategory = VENDOR_CATEGORIES.find(cat => cat.value === searchParams.category);

  return (
    <div className="flex flex-col h-screen bg-linen">
      <WeddingBanner />
      
      <div className="app-content-container flex-1 overflow-hidden">
        <div className="pb-2">
          <a 
            href="/vendors" 
            className="text-[#A85C36] hover:text-[#8B4513] transition-colors text-sm flex items-center gap-1 no-underline w-fit"
          >
            ← Back to Vendor Hub
          </a>
        </div>

        {/* Main content area with three columns */}
        <div className="flex h-full gap-4 overflow-hidden">
          {/* Left Sidebar - Filters */}
          <div className={`${filtersCollapsed ? 'w-[60px]' : 'w-[320px]'} flex-shrink-0 transition-all duration-300 ease-in-out`}>
            <VendorFilters
              category={searchParams.category}
              setCategory={(category) => setSearchParams({ category })}
              location={searchParams.location}
              setLocation={(location) => setSearchParams({ location })}
              priceRange={searchParams.priceRange}
              setPriceRange={(priceRange) => setSearchParams({ priceRange })}
              rating={searchParams.rating}
              setRating={(rating) => setSearchParams({ rating })}
              distance={searchParams.distance}
              setDistance={(distance) => setSearchParams({ distance })}
              expandedFilters={expandedFilters}
              setExpandedFilters={setExpandedFilters}
              categories={VENDOR_CATEGORIES}
              isCollapsed={filtersCollapsed}
              onToggleCollapse={setFiltersCollapsed}
            />
          </div>

          {/* Center - Results */}
          <div className="flex-1 min-w-0 max-w-none overflow-hidden">
            <VendorSearchResults
              ref={vendorSearchResultsRef}
              vendors={vendors}
              loading={loading}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              setCurrentPage={setCurrentPage}
              currentCategory={VENDOR_CATEGORIES.find(cat => cat.value === searchParams.category)?.label || 'Vendors'}
              location={searchParams.location}
              onVendorContact={handleVendorContact}
              onVendorFlag={handleVendorFlag}
              onVendorHover={setHoveredVendor}
              communityVendorData={communityVendorData}
              // Search functionality
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onClearSearch={clearSearch}
              isSearching={isSearching}
              searchResults={searchResults}
              // Map highlighting
              hoveredVendor={hoveredVendor}
            />
          </div>

          {/* Right Sidebar - Map */}
          <div className="w-[540px] flex-shrink-0">
            <VendorMap
              vendors={vendors}
              selectedVendor={selectedVendor}
              onVendorSelect={setSelectedVendor}
              hoveredVendor={hoveredVendor}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onVendorClick={(vendor) => {
                if (vendorSearchResultsRef.current) {
                  vendorSearchResultsRef.current.scrollToVendor(vendor.place_id);
                }
              }}
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
            vendor={{
              id: selectedVendor.place_id || selectedVendor.id || '',
              name: selectedVendor.name
            }}
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
