"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useCustomToast } from '@/hooks/useCustomToast';
import Breadcrumb from '@/components/Breadcrumb';
import VendorContactModal from '@/components/VendorContactModal';
import FlagVendorModal from '@/components/FlagVendorModal';
import VendorMap from '@/components/VendorMap';
import VendorFilters from '@/components/vendor-search/VendorFilters';
import VendorSearchResults from '@/components/vendor-search/VendorSearchResults';
import { useVendorSearch } from '@/hooks/useVendorSearch';
import { VENDOR_CATEGORIES } from '@/constants/vendorCategories';
import { Vendor } from '@/types/vendor';

// Main component

export default function RoverStyleVendorSearch() {
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // Get user's wedding location from profile data
  const { weddingLocation } = useUserProfileData();
  
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

  // Pagination
  const [itemsPerPage] = useState(10);

  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);

  // Update search params when they change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchParams.category) params.set('category', searchParams.category);
    if (searchParams.location) params.set('location', searchParams.location);
    if (searchParams.priceRange.min) params.set('minprice', searchParams.priceRange.min);
    if (searchParams.priceRange.max) params.set('maxprice', searchParams.priceRange.max);
    if (searchParams.rating) params.set('rating', searchParams.rating.toString());
    if (searchParams.distance) params.set('distance', searchParams.distance.toString());

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [searchParams]);

  // Initialize from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category');
    const urlLocation = urlParams.get('location');
    const urlMinPrice = urlParams.get('minprice');
    const urlMaxPrice = urlParams.get('maxprice');
    const urlRating = urlParams.get('rating');
    const urlDistance = urlParams.get('distance');

    if (urlCategory) setSearchParams({ category: urlCategory });
    if (urlLocation) setSearchParams({ location: urlLocation });
    if (urlMinPrice) setSearchParams({ priceRange: { ...searchParams.priceRange, min: urlMinPrice } });
    if (urlMaxPrice) setSearchParams({ priceRange: { ...searchParams.priceRange, max: urlMaxPrice } });
    if (urlRating) setSearchParams({ rating: parseFloat(urlRating) });
    if (urlDistance) setSearchParams({ distance: parseInt(urlDistance) });
  }, []);

  // Handle vendor hover events from map
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
          <div className="flex-1">
            <VendorSearchResults
              vendors={vendors}
              loading={loading}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              setCurrentPage={setCurrentPage}
              currentCategory={currentCategory?.label || 'Vendors'}
              location={searchParams.location}
              onVendorContact={handleVendorContact}
              onVendorFlag={handleVendorFlag}
              onVendorHover={setHoveredVendor}
              communityVendorData={communityVendorData}
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