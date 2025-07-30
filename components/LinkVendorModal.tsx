import React, { useState } from 'react';
import { X, Info, Building } from 'lucide-react';
import VendorSearchField from './VendorSearchField';
import CategorySelectField from './CategorySelectField';
import ContactModalBase from './ContactModalBase';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useCustomToast } from '@/hooks/useCustomToast';
import { addVendorToUserAndCommunity } from '@/lib/addVendorToUserAndCommunity';
import { getRelevantCategories } from '@/utils/vendorSearchUtils';

interface LinkVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkVendor: (vendor: any) => void;
  onUnlinkVendor?: () => void;
  budgetItem: any;
  userId: string;
}

export default function LinkVendorModal({ 
  isOpen, 
  onClose, 
  onLinkVendor, 
  onUnlinkVendor,
  budgetItem, 
  userId 
}: LinkVendorModalProps) {
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { weddingLocation } = useUserProfileData();

  // Check if budget item already has a linked vendor
  const hasExistingVendor = budgetItem?.vendorName && budgetItem?.vendorId;

  // Get relevant categories based on budget item name
  const getRelevantCategoriesForBudgetItem = (itemName: string): string[] => {
    const lowerName = itemName.toLowerCase();
    
    // Map budget item names to contact categories, then use centralized function
    if (lowerName.includes('flower') || lowerName.includes('florist') || lowerName.includes('bouquet')) {
      return getRelevantCategories('Florist');
    }
    if (lowerName.includes('ring') || lowerName.includes('jewelry') || lowerName.includes('diamond')) {
      return getRelevantCategories('Jeweler');
    }
    if (lowerName.includes('cake') || lowerName.includes('dessert') || lowerName.includes('bakery')) {
      return getRelevantCategories('Baker');
    }
    if (lowerName.includes('venue') || lowerName.includes('reception') || lowerName.includes('hall')) {
      return getRelevantCategories('Venue');
    }
    if (lowerName.includes('hair') || lowerName.includes('styling') || lowerName.includes('salon')) {
      return getRelevantCategories('Hair Stylist');
    }
    if (lowerName.includes('photo') || lowerName.includes('photographer')) {
      return getRelevantCategories('Photographer');
    }
    if (lowerName.includes('video') || lowerName.includes('videographer')) {
      return getRelevantCategories('Videographer');
    }
    if (lowerName.includes('dress') || lowerName.includes('gown') || lowerName.includes('bridal')) {
      return getRelevantCategories('Dress Shop');
    }
    if (lowerName.includes('makeup') || lowerName.includes('beauty')) {
      return getRelevantCategories('Makeup Artist');
    }
    if (lowerName.includes('dj') || lowerName.includes('music')) {
      return getRelevantCategories('DJ');
    }
    if (lowerName.includes('planner') || lowerName.includes('coordinator')) {
      return getRelevantCategories('Wedding Planner');
    }
    if (lowerName.includes('cater') || lowerName.includes('food')) {
      return getRelevantCategories('Caterer');
    }
    if (lowerName.includes('car') || lowerName.includes('transport')) {
      return getRelevantCategories('Transportation');
    }
    if (lowerName.includes('officiant') || lowerName.includes('minister')) {
      return getRelevantCategories('Officiant');
    }
    if (lowerName.includes('suit') || lowerName.includes('tux')) {
      return getRelevantCategories('Suit/Tux Rental');
    }
    if (lowerName.includes('invitation') || lowerName.includes('stationery')) {
      return getRelevantCategories('Stationery');
    }
    if (lowerName.includes('rental') || lowerName.includes('equipment')) {
      return getRelevantCategories('Rentals');
    }
    if (lowerName.includes('favor') || lowerName.includes('gift')) {
      return getRelevantCategories('Favors');
    }
    
    // Default to general categories
    return getRelevantCategories('');
  };

  const handleVendorSelect = (vendor: any) => {
    setSelectedVendor(vendor);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    // Clear vendor selection when category changes
    setSelectedVendor(null);
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomCategory(e.target.value);
  };

  const handleLinkVendor = async () => {
    if (!selectedVendor) {
      showErrorToast('Please select a vendor first');
      return;
    }

    setIsSubmitting(true);
    try {
      // First, mark vendor as official if it hasn't been already
      const finalCategory = selectedCategory === "Other" ? customCategory.trim() : selectedCategory;
      
      await addVendorToUserAndCommunity({
        userId,
        vendorMetadata: selectedVendor,
        category: finalCategory || 'Venue',
        selectedAsVendor: true
      });

      // Then link to budget item
      await onLinkVendor(selectedVendor);
      showSuccessToast(`Linked ${selectedVendor.name} to ${budgetItem.name}`);
      onClose();
    } catch (error) {
      console.error('Error linking vendor:', error);
      showErrorToast('Failed to link vendor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearVendor = () => {
    setSelectedVendor(null);
  };

  const handleUnlinkVendor = async () => {
    if (!onUnlinkVendor) return;
    
    setIsSubmitting(true);
    try {
      await onUnlinkVendor();
      showSuccessToast(`Unlinked ${budgetItem.vendorName} from ${budgetItem.name}`);
      onClose();
    } catch (error) {
      console.error('Error unlinking vendor:', error);
      showErrorToast('Failed to unlink vendor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ContactModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Link Vendor to Budget Item"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-primaryinverse px-4 py-2"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          {!hasExistingVendor && (
            <button
              onClick={handleLinkVendor}
              className="btn-primary px-4 py-2"
              disabled={!selectedVendor || isSubmitting}
            >
              {isSubmitting ? 'Linking...' : 'Link Vendor'}
            </button>
          )}
        </div>
      }
    >
      {/* Budget Item Info */}
      <div className="mb-6 p-4 bg-[#F3F2F0] rounded-lg">
        <h4 className="font-medium text-[#332B42] mb-2">Budget Item</h4>
        <p className="text-[#332B42] font-semibold">{budgetItem.name}</p>
        <p className="text-sm text-[#7A7A7A]">${budgetItem.amount.toLocaleString()}</p>
      </div>

      {/* Existing Vendor Info */}
      {hasExistingVendor && (
        <div className="mb-6">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#332B42]">Linked Vendor</span>
            <div className="p-3 bg-gray-50 border border-[#AB9C95] rounded-[5px]">
              <div className="flex items-center justify-between mb-2">
                <h6 className="m-0 font-medium text-[#332B42]">{budgetItem.vendorName}</h6>
                <button
                  onClick={handleUnlinkVendor}
                  className="text-gray-500 hover:text-gray-700 p-1"
                  aria-label="Unlink vendor"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 text-xs text-gray-700">
                <div><strong>Name:</strong> {budgetItem.vendorName}</div>
                {budgetItem.vendorId && (
                  <div><strong>Vendor ID:</strong> {budgetItem.vendorId}</div>
                )}
                <div><strong>Status:</strong> Linked to budget item</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              This vendor is currently linked to your budget item. Click the X to unlink or search for a different vendor below.
            </p>
          </label>
        </div>
      )}

      {/* Category Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#332B42] mb-2">
          Vendor Category
        </label>
        <CategorySelectField
          userId={userId}
          value={selectedCategory}
          customCategoryValue={customCategory}
          onChange={handleCategoryChange}
          onCustomCategoryChange={handleCustomCategoryChange}
          placeholder="Select a vendor category"
          label=""
        />
        <p className="text-xs text-gray-600 mt-2">
          {selectedCategory 
            ? `Searching for ${selectedCategory === "Other" ? customCategory : selectedCategory} vendors in your area.`
            : "Select a category to narrow your search for better results."
          }
        </p>
      </div>

      {/* Vendor Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#332B42] mb-2">
          Search for a vendor
        </label>
        <VendorSearchField
          value={selectedVendor}
          onChange={handleVendorSelect}
          onClear={handleClearVendor}
          placeholder={selectedCategory ? `Search for ${selectedCategory === "Other" ? customCategory : selectedCategory} vendors...` : "Search for any wedding vendor..."}
          categories={selectedCategory ? getRelevantCategories(selectedCategory === "Other" ? customCategory : selectedCategory) : getRelevantCategoriesForBudgetItem(budgetItem.name)}
          location={weddingLocation || 'United States'}
          disabled={!selectedCategory}
        />
        <p className="text-xs text-gray-600 mt-2">
          {selectedCategory 
            ? `Searching for ${selectedCategory === "Other" ? customCategory : selectedCategory} vendors in your area.`
            : "Select a category to narrow your search for better results."
          }
        </p>
      </div>

      {/* Official Vendor Info Banner */}
      {selectedVendor && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="h5 text-blue-900 mb-1">Vendor Will Be Marked as Official</h5>
              <p className="text-sm text-blue-700">
                Linking this vendor to your budget item will automatically mark it as an "Official" vendor in your vendor management system. This helps you track which vendors you're actively working with.
              </p>
            </div>
          </div>
        </div>
      )}
    </ContactModalBase>
  );
} 