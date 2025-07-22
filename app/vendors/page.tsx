"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors } from '@/lib/getContacts';
import { saveVendorToFirestore } from '@/lib/saveContactToFirestore';
import type { Contact } from '@/types/contact';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListFilter, Search } from 'lucide-react';
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

  // Filtered and searched vendors
  const filteredVendors = vendors.filter((v) => {
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(v.category);
    const matchesSearch = vendorSearch.trim() === '' || v.name.toLowerCase().includes(vendorSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);
      getAllVendors(user.uid).then((data) => {
        console.log('🏪 Vendor Hub - Loaded vendors from Firestore:', JSON.stringify(data, null, 2));
        console.log('🏪 Vendor Hub - Vendor images:', data.map(v => ({ name: v.name, image: v.image, placeId: v.placeId })));
        setVendors(data);
        // Count categories
        const counts: Record<string, number> = {};
        data.forEach((vendor) => {
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
      // Find vendor data in user's vendors list
      const favs = favIds
        .map((id: string) => vendors.find((v) => v.id === id || v.placeId === id))
        .filter(Boolean);
      setFavoriteVendors(favs);
    };
    updateFavorites();
    window.addEventListener('storage', updateFavorites);
    return () => window.removeEventListener('storage', updateFavorites);
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
          <div className="flex gap-2">
            <button className="btn-primaryinverse" onClick={() => setAddContactModal(true)}>Add Vendor</button>
            <button className="btn-primary" onClick={() => router.push('/vendors/catalog')}>Browse all</button>
          </div>
        </div>
        {/* Main Content */}
        <div className="app-content-container flex-1 pt-24">
          {/* My Vendors Section */}
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
          >
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
          </MyVendorsSection>

          {/* Recently Viewed Section */}
          <RecentlyViewedSection
            defaultLocation={defaultLocation}
            onContact={(vendor) => {
              // Handle contact action
            }}
            onFlagged={(vendorId) => {
              // Handle flagged action
            }}
          />

          {/* My Favorites Section */}
          <MyFavoritesSection
            vendors={favoriteVendors}
            defaultLocation={defaultLocation}
            onContact={(vendor) => {
              // Handle contact action
            }}
            onFlagged={(vendorId) => {
              // Handle flagged action
            }}
          />
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