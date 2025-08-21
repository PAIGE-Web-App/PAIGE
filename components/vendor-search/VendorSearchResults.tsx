import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Building2, Search, X as LucideX } from 'lucide-react';
import VendorCardRoverStyle from '@/components/VendorCardRoverStyle';
import VendorCardSkeleton from './VendorCardSkeleton';
import { Vendor } from '@/types/vendor';

interface VendorSearchResultsProps {
  vendors: Vendor[];
  loading: boolean;
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  currentCategory: string;
  location: string;
  onVendorContact: (vendor: Vendor) => void;
  onVendorFlag: (vendor: Vendor) => void;
  onVendorHover: (vendor: Vendor | null) => void;
  communityVendorData: Record<string, any>;
  // Search functionality
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  isSearching: boolean;
  searchResults: Vendor[];
  // Map highlighting
  hoveredVendor?: Vendor | null;
}

export interface VendorSearchResultsRef {
  scrollToVendor: (placeId: string) => void;
}

const VendorSearchResults = forwardRef<VendorSearchResultsRef, VendorSearchResultsProps>(({
  vendors,
  loading,
  currentPage,
  itemsPerPage,
  setCurrentPage,
  currentCategory,
  location,
  onVendorContact,
  onVendorFlag,
  onVendorHover,
  communityVendorData,
  // Search functionality
  searchTerm,
  onSearchChange,
  onClearSearch,
  isSearching,
  searchResults,
  // Map highlighting
  hoveredVendor
}, ref) => {
  // Use search results when searching, otherwise use regular vendors
  const allVendors = searchResults.length > 0 ? searchResults : vendors;
  const totalPages = Math.ceil(allVendors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVendors = allVendors.slice(startIndex, endIndex);

  // Collapsible search state
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for vendor cards to enable scrolling
  const vendorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Expose scrollToVendor function to parent component
  useImperativeHandle(ref, () => ({
    scrollToVendor: (placeId: string) => {
      const vendorElement = vendorRefs.current[placeId];
      const scrollContainer = scrollContainerRef.current;
      
      if (vendorElement && scrollContainer) {
        // Calculate the scroll position to bring the vendor into view
        const containerRect = scrollContainer.getBoundingClientRect();
        const vendorRect = vendorElement.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;
        
        // Calculate the target scroll position
        const targetScrollTop = scrollTop + vendorRect.top - containerRect.top - 20; // 20px offset from top
        
        // Smooth scroll to the vendor
        scrollContainer.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    }
  }), []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close search when clicking outside (only if no text)
  useEffect(() => {
    if (!searchOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        // Only close if there's no text in the search bar
        if (!searchTerm.trim()) {
          setSearchOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen, searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    const visiblePages = getVisiblePages();

    return (
      <div className="p-4 border-t border-[#AB9C95] bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#AB9C95]">
            Showing {startIndex + 1} to {Math.min(endIndex, allVendors.length)} of {allVendors.length} vendors
          </div>
          <div className="flex items-center gap-2">
                                <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="btn-primaryinverse disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
            <div className="flex items-center gap-1">
              {visiblePages.map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-2 text-[#AB9C95]">...</span>
                  ) : (
                                            <button
                          onClick={() => handlePageChange(page as number)}
                          className={`px-3 py-1 rounded text-sm ${
                            currentPage === page
                              ? 'btn-secondary'
                              : 'text-[#AB9C95] hover:text-[#332B42] hover:bg-[#F3F2F0]'
                          } transition-colors`}
                        >
                          {page}
                        </button>
                  )}
                </React.Fragment>
              ))}
            </div>
                                    <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="btn-primaryinverse disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#AB9C95] rounded-[5px] h-full flex flex-col overflow-hidden">
      {/* Results Header */}
      <div className="p-4 border-b border-[#AB9C95] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h5 className="h5">
            {!loading ? `${allVendors.length} ${currentCategory} in ${location}` : `${currentCategory} in ${location}`}
          </h5>
        </div>
        
        {/* Collapsible Search */}
        <motion.div 
          className="flex items-center transition-all duration-300"
          style={{ height: '32px' }}
          layout
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {!searchOpen && (
            <motion.button
              layout
              className="p-2 rounded-full hover:bg-[#EBE3DD] transition-colors duration-200 flex-shrink-0"
              style={{ height: '32px', width: '32px' }}
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
              type="button"
            >
              <Search className="w-4 h-4 text-[#364257]" />
            </motion.button>
          )}
          {searchOpen && (
            <motion.div
              layout
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '320px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="relative flex items-center w-[320px] h-8"
            >
              <Search className="w-4 h-4 text-[#364257] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={`Search ${currentCategory}...`}
                className="pl-12 pr-9 w-full h-8 border border-[#A85C36] rounded-[5px] bg-white text-base focus:outline-none focus:border-[#A85C36] transition-all duration-300"
                value={searchTerm}
                onChange={onSearchChange}
                onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); }}
                tabIndex={0}
                autoFocus
              />
              {searchTerm && (
                <button
                  className="absolute right-3 text-[#364257] hover:text-[#A85C36] transition-opacity duration-200 opacity-100"
                  onClick={() => {
                    onClearSearch();
                    setSearchOpen(false);
                  }}
                  tabIndex={0}
                  type="button"
                  style={{ zIndex: 10 }}
                >
                  <LucideX className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Results List - Scrollable */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          // Loading skeletons
          <div className="space-y-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>
                <VendorCardSkeleton />
                {i < 9 && <div className="border-b border-[#AB9C95] h-px" />}
              </div>
            ))}
          </div>
        ) : allVendors.length > 0 ? (
          // Vendor results
          <div className="space-y-0">
            {currentVendors.map((vendor, index) => (
              <div 
                key={vendor.place_id || index}
                ref={(el) => {
                  if (vendor.place_id) {
                    vendorRefs.current[vendor.place_id] = el;
                  }
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onMouseEnter={() => onVendorHover(vendor)}
                  onMouseLeave={() => onVendorHover(null)}
                >
                  <VendorCardRoverStyle
                    vendor={vendor}
                    onContact={() => onVendorContact(vendor)}
                    onShowFlagModal={() => onVendorFlag(vendor)}
                    communityData={communityVendorData[vendor.place_id]}
                    isHighlighted={hoveredVendor?.place_id === vendor.place_id}
                  />
                </motion.div>
                {index < currentVendors.length - 1 && <div className="border-b border-[#AB9C95] h-px" />}
              </div>
            ))}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-12 text-[#AB9C95]">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              {searchTerm ? `No ${currentCategory} found for "${searchTerm}"` : 'No vendors found'}
            </p>
            <p className="text-sm">
              {searchTerm ? 'Try a different search term' : 'Try adjusting your search filters'}
            </p>
            {searchTerm && (
              <button 
                onClick={onClearSearch}
                className="mt-2 text-[#A85C36] hover:underline text-sm"
              >
                Clear search and show all {currentCategory}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {renderPagination()}
    </div>
  );
});

VendorSearchResults.displayName = 'VendorSearchResults';

export default VendorSearchResults;
