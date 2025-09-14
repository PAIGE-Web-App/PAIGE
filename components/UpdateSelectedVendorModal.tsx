import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Check } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useAuth } from '@/contexts/AuthContext';

interface UpdateSelectedVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVendors: any[]; // Changed to array of vendors with pills
  onUpdate: (updatedVendors: any[]) => void;
}

const CATEGORY_OPTIONS = [
  { key: 'venue', label: 'Venue', icon: '🏛️' },
  { key: 'photographer', label: 'Photographer', icon: '📸' },
  { key: 'florist', label: 'Florist', icon: '🌸' },
  { key: 'caterer', label: 'Caterer', icon: '🍽️' },
  { key: 'dj', label: 'DJ/Band', icon: '🎵' },
  { key: 'officiant', label: 'Officiant', icon: '💒' },
  { key: 'beauty', label: 'Beauty Salon', icon: '💄' },
  { key: 'jeweler', label: 'Jeweler', icon: '💍' },
  { key: 'transportation', label: 'Transportation', icon: '🚗' },
  { key: 'planner', label: 'Wedding Planner', icon: '📋' },
  { key: 'stationery', label: 'Stationery', icon: '📝' },
  { key: 'music', label: 'Music', icon: '🎵' },
  { key: 'entertainment', label: 'Entertainment', icon: '🎭' },
  { key: 'photography', label: 'Photography', icon: '📸' },
  { key: 'videography', label: 'Videography', icon: '🎥' },
  { key: 'attire', label: 'Attire', icon: '👗' },
  { key: 'flowers', label: 'Flowers', icon: '🌸' },
  { key: 'decor', label: 'Decor', icon: '🎨' },
  { key: 'food', label: 'Food', icon: '🍽️' },
  { key: 'rings', label: 'Rings', icon: '💍' },
  { key: 'jewelry', label: 'Jewelry', icon: '💍' },
  { key: 'health', label: 'Health', icon: '💄' },
  { key: 'miscellaneous', label: 'Miscellaneous', icon: '⭐' }
];

const UpdateSelectedVendorModal: React.FC<UpdateSelectedVendorModalProps> = ({
  isOpen,
  onClose,
  selectedVendors,
  onUpdate
}) => {
  const [localVendors, setLocalVendors] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
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
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update parent component
      onUpdate(localVendors);
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
          className="bg-white rounded-[5px] shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header row with title and close button */}
          <div className="flex items-center justify-between p-6 border-b border-[#AB9C95]">
            <h5 className="h5 text-left flex-1">Update Selected Vendor Tags</h5>
            <button
              onClick={onClose}
              className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
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
                {localVendors.map((vendor) => (
                  <div key={vendor.id} className="flex items-center gap-4 p-4 border border-[#F3F2F0] rounded-lg">
                    {/* Vendor Info */}
                    <div className="flex-1 min-w-0">
                      <h6 className="h6 truncate">{vendor.name}</h6>
                      <p className="text-sm text-[#5A4A42] truncate">{vendor.address}</p>
                    </div>

                    {/* Category Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#5A4A42]">Category:</span>
                      <select
                        value={getVendorCategory(vendor.id)}
                        onChange={(e) => handleCategoryChange(vendor.id, e.target.value)}
                        className="px-3 py-2 border border-[#AB9C95] rounded-[5px] text-sm focus:ring-2 focus:ring-[#A85C36] focus:border-transparent min-w-[150px]"
                        disabled={isSaving}
                      >
                        <option value="">Select Category</option>
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.icon} {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-[#F3F2F0]">
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
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateSelectedVendorModal;
