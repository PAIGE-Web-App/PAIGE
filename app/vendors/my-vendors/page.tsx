"use client";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors } from '@/lib/getContacts';
import { saveVendorToFirestore } from '@/lib/saveContactToFirestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListFilter, Search, ArrowUpDown } from 'lucide-react';
import CategoryPill from '@/components/CategoryPill';
import { useRouter } from 'next/navigation';
import { useCustomToast } from '@/hooks/useCustomToast';
import SectionHeaderBar from '@/components/SectionHeaderBar';
import BadgeCount from '@/components/BadgeCount';
import Banner from '@/components/Banner';
import VendorSkeleton from '@/components/VendorSkeleton';
import SearchBar from '@/components/SearchBar';
import FilterButtonPopover from '@/components/FilterButtonPopover';
import { highlightText } from '@/utils/searchHighlight';
import DropdownMenu from '@/components/DropdownMenu';
import { MoreHorizontal } from 'lucide-react';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import { 
  convertVendorToCatalogFormat,
  mapGoogleTypesToCategory
} from '@/utils/vendorUtils';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import Breadcrumb from '@/components/Breadcrumb';
import { enhanceVendorsWithImages } from '@/utils/vendorImageUtils';
import { useVendorSectionImageValidation } from '@/hooks/useVendorImageValidation';
import { isSelectedVenue, clearSelectedVenue } from '@/utils/venueUtils';

function ConfirmOfficialModal({ open, onClose, onConfirm, vendorName, category, action }: { open: boolean; onClose: () => void; onConfirm: () => void; vendorName: string; category: string; action: 'star' | 'unstar'; }) {
  if (!open) return null;
  
  const isStarring = action === 'star';
  const title = isStarring ? 'Set as Official Vendor?' : 'Unmark as Official Vendor?';
  const message = isStarring 
    ? `Are you sure you want to set ${vendorName} as your official ${category}? This will unmark any other vendor in this category.`
    : `Are you sure you want to unmark ${vendorName} as your official ${category}?`;
  const confirmText = isStarring ? 'Confirm' : 'Unmark';
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-w-sm p-6 relative flex flex-col items-center"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>
          <h3 className="font-playfair text-xl font-semibold text-[#332B42] mb-4 text-center">{title}</h3>
          <p className="text-sm text-gray-600 mb-6 text-center">
            {message}
          </p>
          <div className="flex justify-center w-full gap-2">
            <button
              onClick={onClose}
              className="btn-primaryinverse px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="btn-primary px-4 py-2 text-sm"
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function MyVendorsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { weddingLocation } = useUserProfileData();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [enhancedVendors, setEnhancedVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Lightweight image validation system
  const { queueVendorsForValidation, runValidation, isValidating } = useVendorSectionImageValidation();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('recent-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; vendor: any; action: 'star' | 'unstar' }>({ open: false, vendor: null, action: 'star' });

  const defaultLocation = weddingLocation || 'United States';

  // Filtered, searched, and sorted vendors
  const filteredVendors = useMemo(() => {
    // Use enhanced vendors if available, otherwise fall back to original vendors
    const vendorsToFilter = enhancedVendors.length > 0 ? enhancedVendors : vendors;
    
    let filtered = vendorsToFilter.filter((v) => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(v.category);
      const matchesSearch = vendorSearch.trim() === '' || v.name.toLowerCase().includes(vendorSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    // Apply sorting
    switch (sortOption) {
      case 'name-asc':
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return [...filtered].sort((a, b) => b.name.localeCompare(a.name));
      case 'recent-desc':
        return [...filtered].sort((a, b) => {
          // Use orderIndex if available (negative timestamp for recent first)
          if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
            return a.orderIndex - b.orderIndex;
          }
          
          // Fallback to addedAt timestamp
          const aTime = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const bTime = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
      case 'category-asc':
        return [...filtered].sort((a, b) => {
          const categoryA = a.category || '';
          const categoryB = b.category || '';
          return categoryA.localeCompare(categoryB);
        });
      case 'rating-desc':
        return [...filtered].sort((a, b) => {
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          return ratingB - ratingA;
        });
      default:
        return filtered;
    }
  }, [vendors, selectedCategories, vendorSearch, sortOption]);

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);
      getAllVendors(user.uid).then((data) => {
        console.log('🏪 My Vendors - Loaded vendors from Firestore:', JSON.stringify(data, null, 2));
        
        // Sort vendors by most recently added first
        const sortedVendors = data.sort((a, b) => {
          // Use orderIndex if available (negative timestamp for recent first)
          if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
            return a.orderIndex - b.orderIndex;
          }
          
          // Fallback to addedAt timestamp
          const aTime = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const bTime = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
        
        setVendors(sortedVendors);
        
        // Count categories
        const counts: Record<string, number> = {};
        sortedVendors.forEach((vendor) => {
          if (vendor.category) {
            counts[vendor.category] = (counts[vendor.category] || 0) + 1;
          }
        });
        setCategoryCounts(counts);
        setIsLoading(false);
      }).catch((error) => {
        console.error('Error loading vendors:', error);
        setIsLoading(false);
      });
    }
  }, [user, isSaving]);

  // Lightweight image validation - only validates when needed
  useEffect(() => {
    if (vendors.length === 0) {
      setEnhancedVendors([]);
      return;
    }

    // Queue vendors for validation (doesn't make API calls yet)
    queueVendorsForValidation(vendors);
    
    // Use existing enhanced vendors or fallback to original vendors
    setEnhancedVendors(vendors);
  }, [vendors, queueVendorsForValidation]);

  // Run validation in background when page is idle
  useEffect(() => {
    if (vendors.length > 0) {
      // Run validation after a short delay to avoid blocking initial render
      const timer = setTimeout(() => {
        runValidation();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [vendors.length, runValidation]);

  // Helper function to identify Firestore document IDs
  const isFirestoreDocumentId = (category) => {
    return typeof category === 'string' && /^[a-zA-Z0-9_-]{15,}$/.test(category);
  };

  // Get unique categories, sorted alphabetically, filtering out Firestore document IDs
  const categories = Object.keys(categoryCounts)
    .filter(cat => !isFirestoreDocumentId(cat))
    .sort((a, b) => a.localeCompare(b));

  // Find official vendor for each category
  const officialByCategory: Record<string, string> = {};
  vendors.forEach((v) => {
    if (v.isOfficial && v.category) officialByCategory[v.category] = v.id;
  });

  // Handler to set a vendor as official
  const handleSetOfficial = async (vendor: any) => {
    setIsSaving(true);
    try {
      // Unmark all in this category, then mark this one
      const updates = vendors
        .filter((v) => v.category === vendor.category)
        .map((v) =>
          saveVendorToFirestore({ ...v, isOfficial: v.id === vendor.id })
        );
      await Promise.all(updates);
      // Update local state
      setVendors((prev) => 
        prev.map((v) => ({ ...v, isOfficial: v.category === vendor.category ? v.id === vendor.id : false }))
      );
      showSuccessToast(`${vendor.name} marked as official ${vendor.category}`);
    } catch (error) {
      console.error('Error setting official vendor:', error);
              showErrorToast('Failed to mark vendor as official');
    }
    setIsSaving(false);
    setConfirmModal({ open: false, vendor: null, action: 'star' });
  };

  // Handler to unset a vendor as official (unstar)
  const handleUnsetOfficial = async (vendor: any) => {
    setIsSaving(true);
    try {
      // Check if this vendor is the selected venue
      if (user?.uid) {
        const isVenue = await isSelectedVenue(user.uid, vendor.placeId || vendor.id);
        if (isVenue) {
          // Clear the selected venue from wedding settings
          const success = await clearSelectedVenue(user.uid);
          if (success) {
            showSuccessToast('Selected venue cleared from wedding settings');
          }
        }
      }
      
      await saveVendorToFirestore({ ...vendor, isOfficial: false });
      // Update local state
      setVendors((prev) => 
        prev.map((v) => v.id === vendor.id ? { ...v, isOfficial: false } : v)
      );
      showSuccessToast(`${vendor.name} unmarked as official ${vendor.category}`);
    } catch (error) {
      console.error('Error unsetting official vendor:', error);
              showErrorToast('Failed to unmark vendor as official');
    }
    setIsSaving(false);
    setConfirmModal({ open: false, vendor: null, action: 'unstar' });
  };

  // Function to handle sort option selection
  const handleSortOptionSelect = (option: string) => {
    setSortOption(option);
    setShowSortMenu(false);
  };

  // Close sort menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showSortMenu && !(event.target as Element).closest('.sort-menu')) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu]);

  // Close sort menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showSortMenu && !(event.target as Element).closest('.sort-menu')) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-linen">
      <div className="max-w-6xl mx-auto w-full bg-[#F3F2F0] relative">
        <div className="app-content-container flex-1 pt-24">
          <Breadcrumb
            items={[
              { label: 'Vendor Hub', href: '/vendors' },
              { label: 'My Vendors', isCurrent: true }
            ]}
          />
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-playfair font-semibold text-[#332B42]">
                  My Vendors
                </h1>
                <BadgeCount 
                  count={enhancedVendors.length > 0 ? enhancedVendors.length : vendors.length}
                />
              </div>
              <button
                onClick={() => router.push('/vendors/catalog')}
                className="btn-primary"
              >
                Add Vendor
              </button>
            </div>
          </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={vendorSearch}
            onChange={setVendorSearch}
            placeholder="Search vendors by name"
            isOpen={searchOpen}
            setIsOpen={setSearchOpen}
          />
        </div>
        
        <div className="flex gap-2">
          {/* Sort Button */}
          <div className="relative sort-menu" ref={sortMenuRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center justify-center border border-[#AB9C95] rounded-[5px] text-[#332B42] hover:text-[#A85C36] px-3 py-1"
              title="Sort vendors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 p-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 flex flex-col min-w-[200px]"
                >
                  <button
                    onClick={() => handleSortOptionSelect('recent-desc')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'recent-desc' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    Most recently added
                  </button>
                  <button
                    onClick={() => handleSortOptionSelect('name-asc')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'name-asc' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    Name (A-Z)
                  </button>
                  <button
                    onClick={() => handleSortOptionSelect('name-desc')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'name-desc' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    Name (Z-A)
                  </button>
                  <button
                    onClick={() => handleSortOptionSelect('category-asc')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'category-asc' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    Category (A-Z)
                  </button>
                  <button
                    onClick={() => handleSortOptionSelect('rating-desc')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'rating-desc' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    Highest rated
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter Button */}
          <FilterButtonPopover
            categories={categories}
            selectedCategories={selectedCategories}
            onSelectCategories={setSelectedCategories}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
        </div>
      </div>

      {/* Active Filters */}
      {(selectedCategories.length > 0 || sortOption !== 'recent-desc') && (
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Sort filter pill */}
          {sortOption && sortOption !== 'recent-desc' && (
            <span className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
              Sort: {
                sortOption === 'name-asc' ? 'Name (A-Z)' :
                sortOption === 'name-desc' ? 'Name (Z-A)' :
                sortOption === 'category-asc' ? 'Category (A-Z)' :
                sortOption === 'rating-desc' ? 'Highest rated' : ''
              }
              <button onClick={() => handleSortOptionSelect('recent-desc')} className="ml-1 text-[#A85C36] hover:text-[#784528]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {/* Category filter pills */}
          {selectedCategories.map((category) => (
            <span key={category} className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
              {category}
              <button 
                onClick={() => setSelectedCategories(prev => prev.filter(cat => cat !== category))} 
                className="ml-1 text-[#A85C36] hover:text-[#784528]"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Vendors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <VendorSkeleton key={index} />
          ))}
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {vendorSearch || selectedCategories.length > 0 
              ? 'No vendors match your search criteria'
              : 'No vendors found'
            }
          </div>
          {(vendorSearch || selectedCategories.length > 0) && (
            <button 
              className="btn-primary"
              onClick={() => {
                setVendorSearch('');
                setSelectedCategories([]);
                setSortOption('recent-desc');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVendors.map((vendor) => {
            const catalogVendor = convertVendorToCatalogFormat(vendor);
            if (!catalogVendor) return null;
            
            return (
            <div key={vendor.id} className="w-full">
              <VendorCatalogCard
                vendor={catalogVendor}
                onContact={() => {
                  // Handle contact
                }}
                onFlagged={(vendorId) => {
                  // Handle flag
                }}
                onSelectionChange={() => {}}
                location={defaultLocation}
                category={vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || ''}
              />
            </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmOfficialModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, vendor: null, action: 'star' })}
        onConfirm={() => {
          if (confirmModal.action === 'star') {
            handleSetOfficial(confirmModal.vendor);
          } else {
            handleUnsetOfficial(confirmModal.vendor);
          }
        }}
        vendorName={confirmModal.vendor?.name || ''}
        category={confirmModal.vendor?.category || ''}
        action={confirmModal.action}
      />
        </div>
      </div>
    </div>
  );
} 