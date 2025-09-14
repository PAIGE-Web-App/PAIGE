import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import SelectField from './SelectField';
import FormField from './FormField';
import { useUserProfileData } from '@/hooks/useUserProfileData';

const CATEGORIES = [
  { value: 'venue', label: 'Venues', singular: 'Venue' },
  { value: 'photographer', label: 'Photographers', singular: 'Photographer' },
  { value: 'florist', label: 'Florists', singular: 'Florist' },
  { value: 'caterer', label: 'Catering', singular: 'Caterer' },
  { value: 'dj', label: 'DJs', singular: 'DJ' },
  { value: 'bakery', label: 'Bakeries & Cakes', singular: 'Baker' },
  { value: 'jewelry_store', label: 'Jewelers', singular: 'Jeweler' },
  { value: 'hair_care', label: 'Hair & Beauty', singular: 'Hair Stylist' },
  { value: 'clothing_store', label: 'Bridal Salons', singular: 'Dress Shop' },
  { value: 'beauty_salon', label: 'Beauty Salons', singular: 'Beauty Salon' },
  { value: 'spa', label: 'Spas', singular: 'Spa' },
  { value: 'car_rental', label: 'Car Rentals', singular: 'Car Rental' },
  { value: 'travel_agency', label: 'Travel Agencies', singular: 'Travel Agency' },
  { value: 'wedding_planner', label: 'Wedding Planners', singular: 'Wedding Planner' },
  { value: 'officiant', label: 'Officiants', singular: 'Officiant' },
  { value: 'suit_rental', label: 'Suit & Tux Rentals', singular: 'Suit & Tux Rental' },
  { value: 'makeup_artist', label: 'Makeup Artists', singular: 'Makeup Artist' },
  { value: 'stationery', label: 'Stationery & Invitations', singular: 'Stationery' },
  { value: 'rentals', label: 'Event Rentals', singular: 'Event Rental' },
  { value: 'favors', label: 'Wedding Favors', singular: 'Wedding Favor' },
  { value: 'band', label: 'Bands', singular: 'Musician' },
];

interface CategorySelectionPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  currentCategory: string;
  currentLocation: string;
}

export default function CategorySelectionPopover({
  isOpen,
  onClose,
  currentCategory,
  currentLocation
}: CategorySelectionPopoverProps) {
  const router = useRouter();
  const { weddingLocation } = useUserProfileData();
  const [category, setCategory] = useState(currentCategory);
  const [location, setLocation] = useState(currentLocation);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle search button click
  const handleSearch = () => {
    if (category) {
      // Always go to the category page directly
      const url = `/vendors/catalog/${category}`;
      router.push(url);
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop that covers everything */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40"
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />
          {/* Modal content with highest z-index */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: 9999 }}
          >
            <motion.div
              ref={popoverRef}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto relative pointer-events-auto modal-above-all"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header row with title and close button */}
            <div className="flex items-center justify-between mb-4">
              <h5 className="h5 text-left">Search Vendors</h5>
              <button
                onClick={onClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <SelectField
                  label="Category"
                  name="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  options={CATEGORIES}
                />
              </div>
              
              <div>
                <FormField
                  label="City, State"
                  name="location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Enter a city or state"
                />
                <a
                  href="/settings?tab=wedding&highlight=weddingLocation"
                  className="text-xs text-[#A85C36] underline mt-1 inline-block"
                >
                  Update Default Value
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="btn-primaryinverse flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSearch}
                className="btn-primary flex-1"
              >
                Search
              </button>
            </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
