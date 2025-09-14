"use client";
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors } from '@/lib/getContacts';
import { saveVendorToFirestore } from '@/lib/saveContactToFirestore';
import type { Contact } from '@/types/contact';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
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
import { useVendorsPageData } from '@/hooks/useVendorsPageData';
import { useFavoritesSimple } from '@/hooks/useFavoritesSimple';
import FlagVendorModal from '@/components/FlagVendorModal';
import VendorContactModal from '@/components/VendorContactModal';
import { VendorHubEmptyState } from '@/components/VendorHubEmptyState';
import { isSelectedVenue, clearSelectedVenue } from '@/utils/venueUtils';
import AdminFavoritesDropdown from '@/components/AdminFavoritesDropdown';
import { usePermissions } from '@/hooks/usePermissions';
import UpdateSelectedVendorModal from '@/components/UpdateSelectedVendorModal';


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
  
  // Get all user data in a single optimized hook
  const { 
    weddingLocation, 
    selectedVenueMetadata, 
    selectedVendors: initialSelectedVendors,
    isLoading: userDataLoading 
  } = useVendorsPageData();
  
  // Use user's wedding location or fallback to default
  const defaultLocation = weddingLocation || 'Dallas, TX';
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; vendor: any | null; action: 'star' | 'unstar' }>({ open: false, vendor: null, action: 'star' });
  const [isSaving, setIsSaving] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; vendor: any | null }>({ open: false, vendor: null });
  const [isLoading, setIsLoading] = useState(true);
  const [addContactModal, setAddContactModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedVendorForContact, setSelectedVendorForContact] = useState<any>(null);
  const [selectedVendorForFlag, setSelectedVendorForFlag] = useState<any>(null);
  const [recentlyViewedCount, setRecentlyViewedCount] = useState<number>(0);
  const [selectedVenuePlaceId, setSelectedVenuePlaceId] = useState<string | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<{ [key: string]: any[] }>({});
  const [showUpdateTagsModal, setShowUpdateTagsModal] = useState(false);

  // Use the simplified favorites hook
  const { 
    favorites, 
    isLoading: favoritesLoading, 
    addFavorite, 
    removeFavorite, 
    toggleFavorite, 
    isFavorite
  } = useFavoritesSimple();

  // The simplified favorites hook already returns full vendor data
  const enhancedFavorites = favorites;

  // Check if user is super admin
  const { isSuperAdmin } = usePermissions();

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
  

  // Watch for changes in recently viewed vendors
  useEffect(() => {
    const checkRecentlyViewed = () => {
      if (typeof window === 'undefined') return;
      try {
        const recent = JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
        setRecentlyViewedCount(recent.length);
      } catch {
        setRecentlyViewedCount(0);
      }
    };

    // Check initially
    checkRecentlyViewed();

    // Listen for storage changes (when other tabs/windows update localStorage)
    window.addEventListener('storage', checkRecentlyViewed);
    
    // Custom event listener for when RecentlyViewedSection clears history
    const handleHistoryCleared = () => {
      checkRecentlyViewed();
    };
    window.addEventListener('historyCleared', handleHistoryCleared);

    return () => {
      window.removeEventListener('storage', checkRecentlyViewed);
      window.removeEventListener('historyCleared', handleHistoryCleared);
    };
  }, []);

  
  // Initialize data from the optimized hook
  useEffect(() => {
    if (selectedVenueMetadata) {
      setSelectedVenuePlaceId(selectedVenueMetadata.place_id);
    } else {
      setSelectedVenuePlaceId(null);
    }
    
    setSelectedVendors(initialSelectedVendors);
  }, [selectedVenueMetadata, initialSelectedVendors]);
  
  // Mobile view mode state - similar to dashboard and todo pages
  const [mobileViewMode, setMobileViewMode] = useState<'vendors' | 'vendor-details'>('vendors');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);



  useEffect(() => {
    if (user?.uid && !userDataLoading) {
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
  }, [user, isSaving, userDataLoading]);



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
      // Check if this vendor is the selected venue
      if (user?.uid) {
        const isVenue = await isSelectedVenue(user.uid, vendor.placeId || vendor.id);
        if (isVenue) {
          // Clear the selected venue from wedding settings
          const success = await clearSelectedVenue(user.uid);
          if (success) {
            showSuccessToast('Selected venue cleared from wedding settings');
            // Update local state
            setSelectedVenuePlaceId(null);
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


  const handleContactAdded = () => {
    setAddContactModal(false);
    showSuccessToast('Contact added successfully!');
  };

  // Mobile view mode handlers
  const handleMobileVendorSelect = useCallback((vendor: any) => {
    setSelectedVendor(vendor);
    setMobileViewMode('vendor-details');
  }, []);

  const handleMobileBackToVendors = useCallback(() => {
    setMobileViewMode('vendors');
    setSelectedVendor(null);
  }, []);

  // Get all vendors that currently have selected vendor pills
  const vendorsWithSelectedPills = useMemo(() => {
    const vendorsWithPills: any[] = [];
    
    // Import the mapping function
    const { mapGoogleTypesToCategory } = require('@/utils/vendorUtils');
    
    vendors.forEach(vendor => {
      let hasPill = false;
      let category = '';
      
      // Check if vendor is main selected venue (from Wedding Details)
      if (selectedVenuePlaceId === vendor.placeId) {
        hasPill = true;
        category = 'main-venue';
      }
      
      // Check if vendor is in selected vendors system
      if (!hasPill && selectedVendors) {
        // First try to find the vendor in any category
        let foundCategory = '';
        let foundVendor = null;
        
        Object.keys(selectedVendors).forEach(key => {
          const categoryVendors = selectedVendors[key] || [];
          const vendorInCategory = categoryVendors.find((v: any) => v.place_id === vendor.placeId);
          if (vendorInCategory) {
            foundCategory = key;
            foundVendor = vendorInCategory;
          }
        });
        
        if (foundVendor) {
          hasPill = true;
          category = foundCategory;
        } else {
          // Fallback to the original logic for backwards compatibility
          const vendorCategory = mapGoogleTypesToCategory(vendor.types, vendor.name);
          const categoryKey = vendorCategory.toLowerCase().replace(/[^a-z0-9]/g, '');
          const categoryVendors = selectedVendors[categoryKey] || [];
          
          const isSelected = categoryVendors.some((v: any) => v.place_id === vendor.placeId);
          if (isSelected) {
            hasPill = true;
            category = categoryKey;
          }
        }
      }
      
      if (hasPill) {
        vendorsWithPills.push({
          ...vendor,
          id: vendor.placeId || vendor.id,
          placeId: vendor.placeId,
          category: category
        });
      }
    });
    
    return vendorsWithPills;
  }, [vendors, selectedVenuePlaceId, selectedVendors]);

  // Show loading state while user data is loading
  if (userDataLoading) {
    return (
      <div className="min-h-screen bg-linen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A85C36] mx-auto mb-4"></div>
          <p className="text-[#332B42]">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        html, body {
          overflow-x: hidden;
          height: 100vh;
          margin: 0;
          padding: 0;
        }
        body {
          position: relative;
        }
        /* Mobile: Full height with fixed nav at bottom */
        @media (max-width: 768px) {
          html, body {
            height: 100vh;
            overflow: hidden;
          }
          .mobile-scroll-container {
            height: 100vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
        /* Desktop: Normal scrolling */
        @media (min-width: 769px) {
          html, body {
            height: auto;
            min-height: 100vh;
            overflow-y: auto;
          }
        }
      `}</style>
      <div className="min-h-screen bg-linen mobile-scroll-container">
        <WeddingBanner
          daysLeft={daysLeft}
          userName={userName}
          isLoading={bannerLoading}
          onSetWeddingDate={handleSetWeddingDate}
        />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8" style={{ width: '100%', maxWidth: '1152px' }}>
        {/* Check if we should show empty state */}
        {vendors.length === 0 && recentlyViewedCount === 0 && !isLoading ? (
          /* Empty State - No header, no tabs, just warm welcome */
          <VendorHubEmptyState 
            variant="main"
            className="h-full px-4"
          />
        ) : (
          /* Normal State - Show header and content */
          <>
            {/* Vendor Hub Header */}
            <div className="flex items-center justify-between py-6 px-0 lg:px-4 bg-[#F3F2F0] border-b border-[#AB9C95] sticky top-0 z-20 shadow-sm" style={{ minHeight: 80, borderBottomWidth: '0.5px' }}>
              <h4 className="text-lg font-playfair font-medium text-[#332B42]">Vendors</h4>
              <div className="flex items-center gap-4">
                <div className="hidden md:block">
                  <AdminFavoritesDropdown isVisible={isSuperAdmin} />
                </div>
                <button 
                  className="btn-primaryinverse" 
                  onClick={() => setShowUpdateTagsModal(true)}
                  disabled={Object.values(selectedVendors).flat().length === 0}
                >
                  Update Tags
                </button>
                <button className="btn-primary" onClick={() => {
                  // On mobile, redirect to mobile catalog page for better mobile experience
                  if (window.innerWidth < 768) {
                    router.push('/vendors/m-catalog');
                  } else {
                    router.push('/vendors/catalog/search');
                  }
                }}>Browse Vendors</button>
              </div>
            </div>
            
            {/* Main Content - Mobile responsive layout */}
            <div className="py-6">
              {/* Mobile view mode content */}
              {mobileViewMode === 'vendors' ? (
                <div className="space-y-6">
                  {/* Official Vendors Section */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-playfair font-medium text-[#332B42]">Official Vendors</h3>
                      <BadgeCount count={vendors.length} />
                    </div>
                    <p className="text-sm text-[#5A4A42] mb-4">Vendors you've officially added to your wedding team from the catalog</p>
                    <MyVendorsSection
                      vendors={vendors}
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
                      onMobileSelect={handleMobileVendorSelect}
                      selectedVenuePlaceId={selectedVenuePlaceId}
                      selectedVendors={selectedVendors}
                      onUpdateSelectedVendor={() => setShowUpdateTagsModal(true)}
                    />
                  </div>

                  {/* My Favorites Section */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-playfair font-medium text-[#332B42]">My Favorites</h3>
                      <BadgeCount count={enhancedFavorites.length} />
                    </div>
                    <p className="text-sm text-[#5A4A42] mb-4">Vendors you've marked as favorites while browsing the catalog</p>
                    <MyFavoritesSection
                      vendors={enhancedFavorites}
                      defaultLocation={defaultLocation}
                      onContact={(vendor) => {
                        // Handle contact action
                      }}
                      onFlagged={(vendorId) => {
                        // Handle flagged action
                      }}
                      onShowContactModal={handleShowContactModal}
                      onShowFlagModal={handleShowFlagModal}
                      onMobileSelect={handleMobileVendorSelect}
                    />
                  </div>

                  {/* Recently Viewed Section */}
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
                </div>
              ) : (
                /* Mobile Vendor Details View */
                <div className="space-y-4">
                  {/* Mobile Vendor Details Header */}
                  <div className="flex items-center gap-4 p-4 bg-white border-b border-[#AB9C95] sticky top-0 z-20">
                    <button
                      onClick={handleMobileBackToVendors}
                      className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
                    >
                      <ArrowLeft className="w-5 h-5 text-[#332B42]" />
                    </button>
                    <h3 className="text-lg font-medium text-[#332B42] truncate">
                      {selectedVendor?.name || 'Vendor Details'}
                    </h3>
                  </div>
                  
                  {/* Mobile Vendor Details Content */}
                  <div className="p-4">
                    {selectedVendor && (
                      <div className="space-y-4">
                        {/* Vendor Image */}
                        {selectedVendor.image && (
                          <div className="aspect-video w-full rounded-lg overflow-hidden">
                            <img
                              src={selectedVendor.image}
                              alt={selectedVendor.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Vendor Info */}
                        <div className="space-y-3">
                          <h2 className="text-xl font-semibold text-[#332B42]">{selectedVendor.name}</h2>
                          {selectedVendor.address && (
                            <p className="text-sm text-gray-600">{selectedVendor.address}</p>
                          )}
                          {selectedVendor.rating && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#332B42]">
                                ⭐ {selectedVendor.rating} ({selectedVendor.user_ratings_total || 0} reviews)
                              </span>
                            </div>
                          )}
                          {selectedVendor.category && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Category:</span>
                              <span className="px-2 py-1 bg-[#EBE3DD] text-[#A85C36] rounded-full text-xs">
                                {selectedVendor.category}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={() => handleShowContactModal(selectedVendor)}
                            className="flex-1 btn-primary py-2"
                          >
                            Contact Vendor
                          </button>
                          <button
                            onClick={() => handleShowFlagModal(selectedVendor)}
                            className="px-4 py-2 border border-[#AB9C95] text-[#332B42] rounded-[5px] hover:bg-gray-50"
                          >
                            Flag
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
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

      {/* Update Selected Vendor Tags Modal */}
        <UpdateSelectedVendorModal
          isOpen={showUpdateTagsModal}
          onClose={() => setShowUpdateTagsModal(false)}
          selectedVendors={vendorsWithSelectedPills}
          selectedVenuePlaceId={selectedVenuePlaceId}
          onUpdate={async (updatedVendors) => {
            try {
              // Update the selectedVendors state with the new categories
              const updatedSelectedVendors = { ...selectedVendors };
              
              // Process each updated vendor
              updatedVendors.forEach(vendor => {
                if (vendor.category) {
                  // Use the category key as-is (it's already in the correct format from the modal)
                  const categoryKey = vendor.category;
                  
                  // Remove from old categories
                  Object.keys(updatedSelectedVendors).forEach(key => {
                    if (key !== categoryKey) {
                      updatedSelectedVendors[key] = updatedSelectedVendors[key].filter(
                        (v: any) => v.place_id !== vendor.placeId
                      );
                    }
                  });
                  
                  // Add to new category
                  if (!updatedSelectedVendors[categoryKey]) {
                    updatedSelectedVendors[categoryKey] = [];
                  }
                  
                  // Check if vendor already exists in this category
                  const existingIndex = updatedSelectedVendors[categoryKey].findIndex(
                    (v: any) => v.place_id === vendor.placeId
                  );
                  
                  if (existingIndex >= 0) {
                    // Update existing vendor
                    updatedSelectedVendors[categoryKey][existingIndex] = {
                      ...updatedSelectedVendors[categoryKey][existingIndex],
                      category: vendor.category
                    };
                  } else {
                    // Add new vendor
                    updatedSelectedVendors[categoryKey].push({
                      place_id: vendor.placeId,
                      name: vendor.name,
                      formatted_address: vendor.address,
                      category: vendor.category
                    });
                  }
                }
              });
              
              // Update state
              setSelectedVendors(updatedSelectedVendors);
              
              // Save to Firestore
              if (user?.uid) {
                const { doc, updateDoc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                  selectedVendors: updatedSelectedVendors
                });
              }
              
              setShowUpdateTagsModal(false);
            } catch (error) {
              console.error('Error updating selected vendors:', error);
            }
          }}
        />
      </div>
    </>
  );
} 