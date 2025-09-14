import React, { useState } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CategorySelectionPopover from './CategorySelectionPopover';

interface VendorCatalogHeaderProps {
  isSearching: boolean;
  searchTerm: string;
  searchResults: any[];
  loading: boolean;
  vendors: any[];
  nextPageToken: string | null;
  error: string | null;
  categoryLabel: string;
  location: string;
}

export default function VendorCatalogHeader({
  isSearching,
  searchTerm,
  searchResults,
  loading,
  vendors,
  nextPageToken,
  error,
  categoryLabel,
  location
}: VendorCatalogHeaderProps) {
  const [showCategoryPopover, setShowCategoryPopover] = useState(false);
  const router = useRouter();
  
  // Map category labels to category values
  const getCategoryValue = (label: string) => {
    const categoryMap: { [key: string]: string } = {
      'Venues': 'venue',
      'Photographers': 'photographer',
      'Florists': 'florist',
      'Catering': 'caterer',
      'DJs': 'dj',
      'Bakeries & Cakes': 'bakery',
      'Jewelers': 'jewelry_store',
      'Hair & Beauty': 'hair_care',
      'Bridal Salons': 'clothing_store',
      'Beauty Salons': 'beauty_salon',
      'Spas': 'spa',
      'Car Rentals': 'car_rental',
      'Travel Agencies': 'travel_agency',
      'Wedding Planners': 'wedding_planner',
      'Officiants': 'officiant',
      'Suit & Tux Rentals': 'suit_rental',
      'Makeup Artists': 'makeup_artist',
      'Stationery & Invitations': 'stationery',
      'Event Rentals': 'rentals',
      'Wedding Favors': 'favors',
      'Bands': 'band'
    };
    return categoryMap[label] || 'venue';
  };
  
  const generateTitle = () => {
    // Keep title static once loaded - don't change based on search
    if (loading) {
      return `Loading ${categoryLabel}...`;
    }
    
    if (vendors.length > 0) {
      if (nextPageToken && vendors.length === 20) {
        return `20+ ${categoryLabel} in ${location || 'All Locations'}`;
      }
      return `${vendors.length} ${categoryLabel} in ${location || 'All Locations'}`;
    }
    
    if (error) {
      return `No ${categoryLabel} found`;
    }
    
    return `${categoryLabel} in ${location || 'All Locations'}`;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 mt-2">
        {/* Left: Back Button */}
        <button
          onClick={() => router.push('/vendors')}
          className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors flex-shrink-0"
          aria-label="Back to Vendor Hub"
        >
          <ArrowLeft className="w-5 h-5 text-[#AB9C95]" />
        </button>
        
        {/* Center: Category Pill */}
        <div className="flex-1 flex justify-center">
          <button 
            className="mobile-filter-category-pill"
            onClick={() => setShowCategoryPopover(true)}
          >
            {generateTitle()}
            <ChevronDown className="w-4 h-4 ml-2" />
          </button>
        </div>
        
        {/* Right: Spacer for balance */}
        <div className="w-7 flex-shrink-0"></div>
      </div>
      
      <CategorySelectionPopover
        isOpen={showCategoryPopover}
        onClose={() => setShowCategoryPopover(false)}
        currentCategory={getCategoryValue(categoryLabel)}
        currentLocation={location}
      />
    </>
  );
} 