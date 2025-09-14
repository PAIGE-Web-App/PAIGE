import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Check } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useAuth } from '@/contexts/AuthContext';

interface UpdateSelectedVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVendors: any[]; // Changed to array of vendors with pills
  selectedVenuePlaceId?: string | null; // The main selected venue from Wedding Details
  onUpdate: (updatedVendors: any[]) => void;
}

const CATEGORY_OPTIONS = [
  { key: 'main-venue', label: 'Main Venue', icon: '⭐' },
  { key: 'venue', label: 'Venue', icon: '' },
  { key: 'photographer', label: 'Photographer', icon: '' },
  { key: 'florist', label: 'Florist', icon: '' },
  { key: 'caterer', label: 'Caterer', icon: '' },
  { key: 'dj', label: 'DJ', icon: '' },
  { key: 'band', label: 'Band', icon: '' },
  { key: 'officiant', label: 'Officiant', icon: '' },
  { key: 'beautysalon', label: 'Beauty Salon', icon: '' },
  { key: 'jeweler', label: 'Jeweler', icon: '' },
  { key: 'weddingplanner', label: 'Wedding Planner', icon: '' },
  { key: 'stationery', label: 'Stationery', icon: '' },
  { key: 'spa', label: 'Spa', icon: '' },
  { key: 'makeupartist', label: 'Makeup Artist', icon: '' },
  { key: 'dressshop', label: 'Dress Shop', icon: '' },
  { key: 'baker', label: 'Baker', icon: '' },
  { key: 'eventrental', label: 'Event Rental', icon: '' },
  { key: 'carrental', label: 'Car Rental', icon: '' },
  { key: 'travelagency', label: 'Travel Agency', icon: '' },
  { key: 'weddingfavor', label: 'Wedding Favor', icon: '' },
  { key: 'suitandtuxrental', label: 'Suit & Tux Rental', icon: '' },
  { key: 'hairstylist', label: 'Hair Stylist', icon: '' },
  { key: 'receptionvenue', label: 'Reception Venue', icon: '' },
  { key: 'church', label: 'Church', icon: '' },
  { key: 'miscellaneous', label: 'Miscellaneous', icon: '' },
  { key: 'other', label: 'Other', icon: '' }
];

const UpdateSelectedVendorModal: React.FC<UpdateSelectedVendorModalProps> = ({
  isOpen,
  onClose,
  selectedVendors,
  selectedVenuePlaceId,
  onUpdate
}) => {
  const [localVendors, setLocalVendors] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [customCategories, setCustomCategories] = useState<{ [vendorId: string]: string }>({});
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { user } = useAuth();

  // Initialize local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalVendors(selectedVendors);
    }
  }, [isOpen, selectedVendors]);

  const handleCategoryChange = (vendorId: string, newCategory: string) => {
    setLocalVendors(prev => 
      prev.map(vendor => 
        (vendor.id === vendorId || vendor.placeId === vendorId) 
          ? { ...vendor, category: newCategory }
          : vendor
      )
    );
    
    // Clear custom category if not "other"
    if (newCategory !== 'other') {
      setCustomCategories(prev => {
        const updated = { ...prev };
        delete updated[vendorId];
        return updated;
      });
    }
  };

  const handleCustomCategoryChange = (vendorId: string, customValue: string) => {
    setCustomCategories(prev => ({
      ...prev,
      [vendorId]: customValue
    }));
    
    // Don't update the vendor's category yet - wait for save
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Apply custom categories to vendors
      const updatedVendors = localVendors.map(vendor => {
        const customCategory = customCategories[vendor.id];
        if (customCategory && getVendorCategory(vendor.id) === 'other') {
          return { ...vendor, category: customCategory };
        }
        return vendor;
      });
      
      // Update parent component
      onUpdate(updatedVendors);
      showSuccessToast('Selected vendor tags updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating selected vendors:', error);
      showErrorToast('Failed to update selected vendor tags');
    } finally {
      setIsSaving(false);
    }
  };

  const getVendorCategory = (vendorId: string): string => {
    const vendor = localVendors.find(v => v.id === vendorId || v.placeId === vendorId);
    return vendor?.category || '';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for click-away close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={onClose}
          />
          {/* Side card */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-50 bg-white border-b border-[#E0DBD7] flex justify-between items-center mb-0 w-full p-4">
              <h5 className="text-h5 font-playfair text-[#332B42]">
                Update Selected Vendor Tags
              </h5>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col overflow-y-auto">
              <p className="text-sm text-[#5A4A42] mb-6">
                Update the category tags for your selected vendors. This helps ensure accurate categorization for AI content generation.
              </p>

              {localVendors.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏷️</div>
                  <h4 className="text-lg font-medium text-[#332B42] mb-2">No Selected Vendors</h4>
                  <p className="text-[#5A4A42]">You don't have any selected vendors to update yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {localVendors.map((vendor, index) => (
                    <div key={vendor.id || vendor.placeId || `vendor-${index}`} className="space-y-3 p-4 border border-[#F3F2F0] rounded-lg">
                      {/* Vendor Info */}
                      <div className="flex-1 min-w-0">
                        <h6 className="h6 truncate">{vendor.name}</h6>
                      </div>

                      {/* Category Selector using SelectField styling */}
                      <div className="relative">
                        <select
                          value={getVendorCategory(vendor.id)}
                          onChange={(e) => handleCategoryChange(vendor.id, e.target.value)}
                          className={`w-full border pr-10 pl-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] border-[#AB9C95]`}
                          disabled={isSaving}
                        >
                          <option value="">Select Category</option>
                        {CATEGORY_OPTIONS.map((option) => {
                          // Show star emoji for main-venue category
                          const showStar = option.key === 'main-venue';
                          return (
                            <option key={option.key} value={option.key}>
                              {showStar ? '⭐ ' : ''}{option.label}
                            </option>
                          );
                        })}
                        </select>
                        {/* Custom chevron icon */}
                        <svg
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#332B42]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      
                      {/* Custom Category Input - only show if "Other" is selected */}
                      {(getVendorCategory(vendor.id) === 'other' || customCategories[vendor.id]) && (
                        <div className="relative">
                          <input
                            type="text"
                            value={customCategories[vendor.id] || ''}
                            onChange={(e) => handleCustomCategoryChange(vendor.id, e.target.value)}
                            placeholder="Enter custom category..."
                            className="w-full border pr-4 pl-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] border-[#AB9C95]"
                            disabled={isSaving}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#F3F2F0] flex-shrink-0">
              <button
                onClick={onClose}
                className="btn-primaryinverse px-4 py-2 text-sm"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UpdateSelectedVendorModal;
