"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors } from '@/lib/getContacts';
import { saveVendorToFirestore } from '@/lib/saveContactToFirestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListFilter, Search, ArrowUpDown } from 'lucide-react';
import CategoryPill from '@/components/CategoryPill';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
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
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('recent-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; vendor: any; action: 'star' | 'unstar' }>({ open: false, vendor: null, action: 'star' });

  const defaultLocation = weddingLocation || 'United States';

  // Filtered, searched, and sorted vendors
  const filteredVendors = useMemo(() => {
    let filtered = vendors.filter((v) => {
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
      toast.success(`${vendor.name} marked as official ${vendor.category}`);
    } catch (error) {
      console.error('Error setting official vendor:', error);
      toast.error('Failed to mark vendor as official');
    }
    setIsSaving(false);
    setConfirmModal({ open: false, vendor: null, action: 'star' });
  };

  // Handler to unset a vendor as official (unstar)
  const handleUnsetOfficial = async (vendor: any) => {
    setIsSaving(true);
    try {
      await saveVendorToFirestore({ ...vendor, isOfficial: false });
      // Update local state
      setVendors((prev) => 
        prev.map((v) => v.id === vendor.id ? { ...v, isOfficial: false } : v)
      );
      toast.success(`${vendor.name} unmarked as official ${vendor.category}`);
    } catch (error) {
      console.error('Error unsetting official vendor:', error);
      toast.error('Failed to unmark vendor as official');
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

  // Close filter menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showFilterMenu && !(event.target as Element).closest('.filter-menu')) {
        setShowFilterMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="app-content-container">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/vendors')}
              className="text-sm text-[#A85C36] hover:text-[#332B42] transition-colors"
            >
              ← Back to Vendor Hub
            </button>
            <h1 className="text-2xl font-playfair font-semibold text-[#332B42]">
              My Vendors
            </h1>
            <span className="text-sm text-[#7A7A7A]">
              {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}
            </span>
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
          <input
            type="text"
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            placeholder="Search vendors..."
            className="w-full px-3 py-2 border border-[#E0D6D0] rounded-lg text-sm text-[#332B42] focus:outline-none focus:border-[#A85C36]"
          />
        </div>
        
        <div className="flex gap-2">
          {/* Sort Button */}
          <div className="relative sort-menu">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E0D6D0] rounded-lg text-sm text-[#332B42] hover:bg-[#F3F2F0] transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort
            </button>
            
            {showSortMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-[#E0D6D0] rounded-lg shadow-lg z-10 min-w-[200px]">
                <div className="p-2">
                  {[
                    { value: 'recent-desc', label: 'Most Recent' },
                    { value: 'name-asc', label: 'Name A-Z' },
                    { value: 'name-desc', label: 'Name Z-A' },
                    { value: 'category-asc', label: 'Category A-Z' },
                    { value: 'rating-desc', label: 'Highest Rated' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortOptionSelect(option.value)}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-[#F3F2F0] transition-colors ${
                        sortOption === option.value ? 'bg-[#F3F2F0] text-[#A85C36]' : 'text-[#332B42]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E0D6D0] rounded-lg text-sm text-[#332B42] hover:bg-[#F3F2F0] transition-colors"
          >
            <ListFilter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {(selectedCategories.length > 0 || sortOption !== 'recent-desc') && (
        <div className="mb-6 flex flex-wrap gap-2">
          {selectedCategories.map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-2 px-3 py-1 bg-[#A85C36] text-white text-sm rounded-full"
            >
              {category}
              <button
                onClick={() => setSelectedCategories(prev => prev.filter(c => c !== category))}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            </span>
          ))}
          {sortOption !== 'recent-desc' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#A85C36] text-white text-sm rounded-full">
              Sort: {sortOption === 'name-asc' ? 'Name A-Z' : sortOption === 'name-desc' ? 'Name Z-A' : sortOption === 'category-asc' ? 'Category A-Z' : 'Highest Rated'}
              <button
                onClick={() => setSortOption('recent-desc')}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {/* Vendors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="w-full">
              <VendorCatalogCard
                vendor={convertVendorToCatalogFormat(vendor)}
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
          ))}
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
  );
} 