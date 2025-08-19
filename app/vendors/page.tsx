"use client";
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors } from '@/lib/getContacts';
import { saveVendorToFirestore } from '@/lib/saveContactToFirestore';
import type { Contact } from '@/types/contact';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListFilter, Search, ArrowUpDown } from 'lucide-react';
import CategoryPill from '@/components/CategoryPill';
import { useRouter } from 'next/navigation';
import EditContactModal from '@/components/EditContactModal';
import { useCustomToast } from '@/hooks/useCustomToast';
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
import { enhanceVendorsWithImages } from '@/utils/vendorImageUtils';
import { MyVendorsSection } from '@/components/vendor-sections/MyVendorsSection';
import { RecentlyViewedSection } from '@/components/vendor-sections/RecentlyViewedSection';
import { MyFavoritesSection } from '@/components/vendor-sections/MyFavoritesSection';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useFavorites } from '@/hooks/useFavorites';
import VendorTabs from '@/components/VendorTabs';
import FlagVendorModal from '@/components/FlagVendorModal';
import VendorContactModal from '@/components/VendorContactModal';
import { AdminNavigation } from '@/components/AdminNavigation';


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
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
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
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedVendorForContact, setSelectedVendorForContact] = useState<any>(null);
  const [selectedVendorForFlag, setSelectedVendorForFlag] = useState<any>(null);
  const [enhancedFavorites, setEnhancedFavorites] = useState<any[]>([]);

  // Temporary: Use localStorage directly until we fix the SSR issue
    // Use the proper useFavorites hook for persistent favorites
  const { 
    favorites, 
    isLoading: favoritesLoading, 
    addFavorite, 
    removeFavorite, 
    toggleFavorite, 
    isFavorite,
    refreshFavorites 
  } = useFavorites();

  // Flag modal handlers
  const handleShowFlagModal = (vendor: any) => {
    setSelectedVendorForFlag(vendor);
    setShowFlagModal(true);
  };

  const handleFlagVendor = async (reason: string, customReason?: string) => {
    if (!selectedVendorForFlag) return;
    
    try {
      const response = await fetch('/api/flag-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: selectedVendorForFlag.id,
          vendorName: selectedVendorForFlag.name,
          reason,
          customReason
        })
      });

      if (response.ok) {
        showSuccessToast('Vendor flagged successfully');
        setShowFlagModal(false);
        setSelectedVendorForFlag(null);
      } else {
        showErrorToast('Failed to flag vendor');
      }
    } catch (error) {
      console.error('Error flagging vendor:', error);
      showErrorToast('Failed to flag vendor');
    }
  };

  // Contact modal handlers
  const handleShowContactModal = (vendor: any) => {
    setSelectedVendorForContact(vendor);
    setShowContactModal(true);
  };
  
  // Load favorites from Firestore on component mount
  useEffect(() => {
    if (user?.uid) {
      refreshFavorites();
    }
  }, [user?.uid, refreshFavorites]);

  // Fetch missing favorites data from Firestore
  useEffect(() => {
    const fetchMissingFavorites = async () => {
      if (!user?.uid || favorites.length === 0) return;
      
      try {
        const response = await fetch(`/api/user-favorites?userId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          
          // Process Firestore favorites data
          let favsFromFirestore = data.favorites
            .filter((f: any) => favorites.includes(f.placeId || f.id))
            .map((f: any) => {
              // Try multiple possible field names for each property
              const vendorName = f.name || f.vendorName || f.vendor?.name || 'Unknown Vendor';
              const vendorAddress = f.address || f.vendorAddress || f.vendor?.address || '';
              const vendorCategory = f.category || f.vendorCategory || f.vendor?.category || 'Vendor';
              const vendorRating = f.rating || f.vendor?.rating || 0;
              const vendorReviewCount = f.reviewCount || f.vendor?.reviewCount || f.user_ratings_total || 0;
              const vendorImage = f.image || f.vendor?.image || '';
              
              return {
                id: f.placeId || f.id,
                place_id: f.placeId || f.id,
                name: vendorName,
                address: vendorAddress,
                rating: vendorRating,
                user_ratings_total: vendorReviewCount,
                image: vendorImage,
                mainTypeLabel: vendorCategory
              };
            });
          
          // For favorites without vendor data, try to fetch from Google Places API
          const incompleteFavorites = favsFromFirestore.filter(f => f.name === 'Unknown Vendor');
          if (incompleteFavorites.length > 0) {
            try {
              const placeDetailsPromises = incompleteFavorites.map(async (favorite) => {
                try {
                  const response = await fetch(`/api/google-place-details?placeId=${favorite.place_id}`);
                  if (response.ok) {
                    const placeData = await response.json();
                    
                    if (placeData.result) {
                      // Get the best available image
                      let bestImage = favorite.image;
                      if (placeData.result.photos && placeData.result.photos.length > 0) {
                        const photo = placeData.result.photos[0];
                        bestImage = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
                      }
                      
                      return {
                        ...favorite,
                        name: placeData.result.name || favorite.name,
                        address: placeData.result.formatted_address || favorite.address,
                        rating: placeData.result.rating || favorite.rating,
                        user_ratings_total: placeData.result.user_ratings_total || favorite.user_ratings_total,
                        image: bestImage
                      };
                    }
                  }
                } catch (error) {
                  console.error('Error fetching place details for', favorite.place_id, ':', error);
                }
                return favorite;
              });
              
              const enhancedFavorites = await Promise.all(placeDetailsPromises);
              
              // Replace incomplete favorites with enhanced ones
              favsFromFirestore = favsFromFirestore.map(f => {
                const enhanced = enhancedFavorites.find(ef => ef.place_id === f.place_id);
                return enhanced || f;
              });
            } catch (error) {
              console.error('Error enhancing incomplete favorites:', error);
            }
          }
          
          setEnhancedFavorites(favsFromFirestore);
        }
      } catch (error) {
        console.error('Error fetching favorites from Firestore:', error);
      }
    };

    fetchMissingFavorites();
  }, [user?.uid, favorites]);
  
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
    
    // Get favorite vendors from both the main vendors list and recently viewed vendors
    const favoriteVendorsFromMain = vendors.filter(v => isFavorite(v.id) || isFavorite(v.placeId));
    const favoriteVendorsFromRecent = recentlyViewedVendors.filter(v => isFavorite(v.id) || isFavorite(v.placeId));
    
    // Create a map to track unique vendors by placeId (preferred) or id
    const uniqueVendorsMap = new Map();
    
    // Add vendors from main list first (these are more complete)
    favoriteVendorsFromMain.forEach(vendor => {
      const key = vendor.placeId || vendor.id;
      if (key && !uniqueVendorsMap.has(key)) {
        uniqueVendorsMap.set(key, vendor);
      }
    });
    
    // Add vendors from recently viewed only if not already present
    favoriteVendorsFromRecent.forEach(vendor => {
      const key = vendor.placeId || vendor.id;
      if (key && !uniqueVendorsMap.has(key)) {
        uniqueVendorsMap.set(key, vendor);
      }
    });
    
    // Add enhanced favorites from Firestore (Google Places vendors)
    enhancedFavorites.forEach(vendor => {
      const key = vendor.place_id || vendor.id;
      if (key && !uniqueVendorsMap.has(key)) {
        uniqueVendorsMap.set(key, vendor);
      }
    });
    
    const allFavoriteVendors = Array.from(uniqueVendorsMap.values());
    
    let filtered = allFavoriteVendors.filter((v) => {
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
  }, [vendors, favorites, isFavorite, selectedCategories, vendorSearch, sortOption, user?.uid, enhancedFavorites]);

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);
      getAllVendors(user.uid).then(async (data) => {

        
        // Enhance vendors with high-quality images
        let enhancedVendors = data;
        try {
          enhancedVendors = await enhanceVendorsWithImages(data);

        } catch (error) {
          console.error('Error enhancing vendors with images:', error);
          // Continue with unenhanced vendors if enhancement fails
        }
        
        // Sort vendors by most recently added first
        const sortedVendors = enhancedVendors.sort((a, b) => {
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



  // The useFavorites hook now handles all favorites management

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

  const handleContactAdded = () => {
    setAddContactModal(false);
    showSuccessToast('Contact added successfully!');
  };

  return (
    <div className="flex flex-col h-full bg-linen">
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={bannerLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      
      {/* Admin Navigation - Only shows for admin users */}
      <AdminNavigation />
      
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
            onShowContactModal={handleShowContactModal}
            onShowFlagModal={handleShowFlagModal}
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
              onShowContactModal={handleShowContactModal}
              onShowFlagModal={handleShowFlagModal}
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
              onShowContactModal={handleShowContactModal}
              onShowFlagModal={handleShowFlagModal}
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
      
      {/* Add Contact Modal */}
      {addContactModal && (
        <AddContactModal
          isOpen={addContactModal}
          onClose={() => setAddContactModal(false)}
          onContactAdded={handleContactAdded}
          defaultLocation={defaultLocation}
        />
      )}

      {/* Flag Modal */}
      {showFlagModal && selectedVendorForFlag && (
        <FlagVendorModal
          vendor={selectedVendorForFlag}
          onClose={() => {
            setShowFlagModal(false);
            setSelectedVendorForFlag(null);
          }}
          onSubmit={handleFlagVendor}
          isSubmitting={false}
        />
      )}

      {/* Contact Modal */}
      {showContactModal && selectedVendorForContact && (
        <VendorContactModal
          vendor={selectedVendorForContact}
          isOpen={showContactModal}
          onClose={() => {
            setShowContactModal(false);
            setSelectedVendorForContact(null);
          }}
        />
      )}
    </div>
  );
} 