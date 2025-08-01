"use client";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors } from '@/lib/getContacts';
import { saveVendorToFirestore } from '@/lib/saveContactToFirestore';
import type { Contact } from '@/types/contact';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListFilter, Search, ArrowUpDown } from 'lucide-react';
import CategoryPill from '@/components/CategoryPill';
import { useRouter } from 'next/navigation';
import EditContactModal from '@/components/EditContactModal';
import { toast } from 'react-hot-toast';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import SectionHeaderBar from '@/components/SectionHeaderBar';
import BadgeCount from '@/components/BadgeCount';
import Banner from '@/components/Banner';
import VendorSkeleton from '@/components/VendorSkeleton';
import { Mail, Phone } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import FilterButtonPopover from '@/components/FilterButtonPopover';
import { highlightText } from '@/utils/searchHighlight';
import AddContactModal from '@/components/AddContactModal';
import DropdownMenu from '@/components/DropdownMenu';
import { MoreHorizontal } from 'lucide-react';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import { 
  convertVendorToCatalogFormat,
  mapGoogleTypesToCategory
} from '@/utils/vendorUtils';
import { MyVendorsSection } from '@/components/vendor-sections/MyVendorsSection';
import { RecentlyViewedSection } from '@/components/vendor-sections/RecentlyViewedSection';
import { MyFavoritesSection } from '@/components/vendor-sections/MyFavoritesSection';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import VendorTabs from '@/components/VendorTabs';

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



export default function VendorsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);
  
  // Get user's wedding location from profile data
  const { weddingLocation, profileLoading } = useUserProfileData();
  
  // Use user's wedding location or fallback to default
  const defaultLocation = weddingLocation || 'Dallas, TX';
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; vendor: any | null; action: 'star' | 'unstar' }>({ open: false, vendor: null, action: 'star' });
  const [isSaving, setIsSaving] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; vendor: any | null }>({ open: false, vendor: null });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [addContactModal, setAddContactModal] = useState(false);

  const [favoriteVendors, setFavoriteVendors] = useState<any[]>([]);
  const [sortOption, setSortOption] = useState<string>('recent-desc'); // Default to most recently added
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('my-vendors');

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

  // Filtered, searched, and sorted favorites
  const filteredFavorites = useMemo(() => {
    let filtered = favoriteVendors.filter((v) => {
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
  }, [favoriteVendors, selectedCategories, vendorSearch, sortOption]);

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);
      getAllVendors(user.uid).then((data) => {
        console.log('🏪 Vendor Hub - Loaded vendors from Firestore:', JSON.stringify(data, null, 2));
        console.log('🏪 Vendor Hub - Vendor images:', data.map(v => ({ name: v.name, image: v.image, placeId: v.placeId })));
        
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



  // Helper to get favorite vendor IDs from localStorage
  function getFavoriteVendorIds() {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
    } catch {
      return [];
    }
  }

  // Update favorite vendors when vendors or favorites change
  useEffect(() => {
    const updateFavorites = () => {
      const favIds = getFavoriteVendorIds();
      
      // Get recently viewed vendors from localStorage
      const getRecentlyViewedVendors = () => {
        if (typeof window === 'undefined') return [];
        try {
          return JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
        } catch {
          return [];
        }
      };
      
      const recentlyViewedVendors = getRecentlyViewedVendors();
      
      // Find vendor data in user's vendors list
      const favsFromUserVendors = favIds
        .map((id: string) => vendors.find((v) => v.id === id || v.placeId === id))
        .filter(Boolean);
      
      // Find vendor data in recently viewed vendors list
      const favsFromRecentlyViewed = favIds
        .map((id: string) => recentlyViewedVendors.find((v) => v.id === id || v.placeId === id))
        .filter(Boolean);
      
      // Combine both lists, removing duplicates
      const allFavs = [...favsFromUserVendors];
      favsFromRecentlyViewed.forEach(recentlyViewedVendor => {
        if (!allFavs.some(v => v.id === recentlyViewedVendor.id || v.placeId === recentlyViewedVendor.placeId)) {
          allFavs.push(recentlyViewedVendor);
        }
      });
      
      setFavoriteVendors(allFavs);
    };
    updateFavorites();
    
    // Listen for both storage events (from other tabs) and custom events (from same tab)
    window.addEventListener('storage', updateFavorites);
    window.addEventListener('vendorFavoritesChanged', updateFavorites);
    
    return () => {
      window.removeEventListener('storage', updateFavorites);
      window.removeEventListener('vendorFavoritesChanged', updateFavorites);
    };
  }, [vendors]);

  // Helper function to identify Firestore document IDs
  const isFirestoreDocumentId = (category) => {
    return typeof category === 'string' && /^[a-zA-Z0-9_-]{15,}$/.test(category);
  };

  // Get unique categories, sorted alphabetically, filtering out Firestore document IDs
  const categories = Object.keys(categoryCounts)
    .filter(cat => !isFirestoreDocumentId(cat))
    .sort((a, b) => a.localeCompare(b));
  const allCount = vendors.length;

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
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    }

    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortMenu]);

  return (
    <div className="flex flex-col h-full bg-linen">
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={bannerLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      <div className="max-w-6xl mx-auto w-full bg-[#F3F2F0] relative">
        {/* Vendor Hub Header */}
        <div className="flex items-center justify-between py-6 bg-[#F3F2F0] border-b border-[#AB9C95] sticky top-0 z-20 shadow-sm" style={{ minHeight: 80 }}>
          <h4 className="text-lg font-playfair font-medium text-[#332B42]">Vendor Hub</h4>
          <div className="flex items-center gap-4">
            <button className="btn-primaryinverse" onClick={() => setAddContactModal(true)}>Add Vendor</button>
            <button className="btn-primary" onClick={() => router.push('/vendors/catalog')}>Browse all</button>
          </div>
        </div>
        {/* Main Content */}
        <div className="app-content-container flex-1 pt-24">
          {/* Recently Viewed Section - Now at the top */}
          <RecentlyViewedSection
            defaultLocation={defaultLocation}
            onContact={(vendor) => {
              // Handle contact action
            }}
            onFlagged={(vendorId) => {
              // Handle flagged action
            }}
          />

          {/* Vendor Tabs and Action Buttons Row */}
          <div className="flex items-center justify-between mb-2">
            {/* Vendor Tabs */}
            <VendorTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              myVendorsCount={filteredVendors.length}
              favoritesCount={filteredFavorites.length}
            />

            {/* Action Buttons - Show for both My Vendors and Favorites tabs */}
            {(activeTab === 'my-vendors' || activeTab === 'favorites') && (
              <div className="flex items-center gap-3">
                {/* Sort Button */}
                <div className="relative" ref={sortMenuRef}>
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
                <FilterButtonPopover
                  categories={categories}
                  selectedCategories={selectedCategories}
                  onSelectCategories={setSelectedCategories}
                  showFilters={showFilters}
                  setShowFilters={setShowFilters}
                />
                <SearchBar
                  value={vendorSearch}
                  onChange={setVendorSearch}
                  placeholder="Search vendors by name"
                  isOpen={searchOpen}
                  setIsOpen={setSearchOpen}
                />
              </div>
            )}
          </div>

          {/* Applied filter pills above vendor sections */}
          {(activeTab === 'my-vendors' || activeTab === 'favorites') && (
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

          {/* Tab Content */}
          {activeTab === 'my-vendors' && (
            <MyVendorsSection
              vendors={filteredVendors}
              defaultLocation={defaultLocation}
              isLoading={isLoading}
              onContact={(vendor) => {
                // Handle contact action
              }}
              onFlagged={(vendorId) => {
                // Handle flagged action
              }}
            />
          )}

          {activeTab === 'favorites' && (
            <MyFavoritesSection
              vendors={filteredFavorites}
              defaultLocation={defaultLocation}
              onContact={(vendor) => {
                // Handle contact action
              }}
              onFlagged={(vendorId) => {
                // Handle flagged action
              }}
            />
          )}
        </div>
      </div>

      <ConfirmOfficialModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, vendor: null, action: 'star' })}
        onConfirm={() => {
          if (confirmModal.vendor) {
            if (confirmModal.action === 'star') {
              handleSetOfficial(confirmModal.vendor);
            } else {
              handleUnsetOfficial(confirmModal.vendor);
            }
          }
        }}
        vendorName={confirmModal.vendor?.name || ''}
        category={confirmModal.vendor?.category || ''}
        action={confirmModal.action}
      />
      
      {/* EditContactModal overlay - For now, we'll keep this but it should be updated for vendor editing */}
      {editModal.open && editModal.vendor && user?.uid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <EditContactModal
            contact={editModal.vendor}
            userId={user.uid}
            onClose={() => setEditModal({ open: false, vendor: null })}
            onSave={(updated) => {
              setVendors((prev) => prev.map((v) => v.id === updated.id ? updated : v));
              setEditModal({ open: false, vendor: null });
            }}
            onDelete={(deletedId) => {
              setVendors((prev) => prev.filter((v) => v.id !== deletedId));
              setEditModal({ open: false, vendor: null });
            }}
          />
        </div>
      )}
      
      {addContactModal && user?.uid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <AddContactModal
            userId={user.uid}
            onClose={() => setAddContactModal(false)}
            onSave={(newContact) => {
              // This should add a contact person, not a vendor
              setAddContactModal(false);
              toast.success(`Contact "${newContact.name}" added successfully!`);
            }}
          />
        </div>
      )}
    </div>
  );
} 