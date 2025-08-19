import React from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
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
}

export default function VendorSearchResults({
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
  communityVendorData
}: VendorSearchResultsProps) {
  const totalPages = Math.ceil(vendors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVendors = vendors.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const pages = [];
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
            Showing {startIndex + 1} to {Math.min(endIndex, vendors.length)} of {vendors.length} vendors
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
    <div className="bg-white border border-[#AB9C95] rounded-[5px] h-full flex flex-col">
      {/* Results Header */}
      <div className="p-4 border-b border-[#AB9C95] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h5 className="h5">
            {!loading ? `${vendors.length} ${currentCategory} in ${location}` : `${currentCategory} in ${location}`}
          </h5>
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
            // Vendor results
            currentVendors.map((vendor, index) => (
              <motion.div
                key={vendor.place_id || index}
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
      {renderPagination()}
    </div>
  );
}
