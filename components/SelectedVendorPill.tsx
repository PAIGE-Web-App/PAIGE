import React from 'react';
import { getCategoryHexColor } from '@/utils/categoryStyle';

interface SelectedVendorPillProps {
  category: string;
  isSelectedVenue?: boolean;
  isMainSelectedVenue?: boolean; // New prop to identify the main selected venue from Wedding Details
  onClick?: () => void;
  clickable?: boolean;
}

// Use your existing category color system
const getCategoryColor = (category: string, isSelectedVenue: boolean = false): string => {
  // Special color for selected venue - use your accent color
  if (isSelectedVenue) {
    return '#A85C36'; // Your accent color
  }

  // Use your existing deterministic color system
  return getCategoryHexColor(category);
};

// Category-specific icons - only show star emoji for main selected venue
const getCategoryIcon = (category: string, isMainSelectedVenue: boolean = false): string => {
  if (isMainSelectedVenue) {
    return '⭐';
  }

  // No emojis for other categories
  return '';
};

// Convert category key to proper display name
const getCategoryDisplayName = (category: string): string => {
  const categoryMap: { [key: string]: string } = {
    'main-venue': 'Main Venue',
    'venue': 'Venue',
    'photographer': 'Photographer',
    'florist': 'Florist',
    'caterer': 'Caterer',
    'dj': 'DJ',
    'band': 'Band',
    'officiant': 'Officiant',
    'beautysalon': 'Beauty Salon',
    'jeweler': 'Jeweler',
    'weddingplanner': 'Wedding Planner',
    'stationery': 'Stationery',
    'spa': 'Spa',
    'makeupartist': 'Makeup Artist',
    'dressshop': 'Dress Shop',
    'baker': 'Baker',
    'eventrental': 'Event Rental',
    'carrental': 'Car Rental',
    'travelagency': 'Travel Agency',
    'weddingfavor': 'Wedding Favor',
    'suitandtuxrental': 'Suit & Tux Rental',
    'hairstylist': 'Hair Stylist',
    'receptionvenue': 'Reception Venue',
    'church': 'Church',
    'miscellaneous': 'Miscellaneous',
    'other': 'Other'
  };
  
  return categoryMap[category] || category;
};

const SelectedVendorPill: React.FC<SelectedVendorPillProps> = ({ 
  category, 
  isSelectedVenue = false,
  isMainSelectedVenue = false,
  onClick,
  clickable = false
}) => {
  const backgroundColor = getCategoryColor(category, isSelectedVenue);
  const icon = getCategoryIcon(category, isMainSelectedVenue || category === 'main-venue');
  const categoryDisplayName = getCategoryDisplayName(category);
  const displayText = category === 'main-venue' ? 'Selected Main Venue' : (isSelectedVenue ? 'Selected Venue' : `Selected ${categoryDisplayName}`);

  return (
    <div
      className={`inline-flex items-center gap-1 text-white px-2 py-1 rounded-full text-xs font-medium mb-2 ${
        clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
      }`}
      style={{ backgroundColor }}
      onClick={clickable ? onClick : undefined}
      title={clickable ? 'Click to update category' : undefined}
    >
      {icon && <span className="text-xs">{icon}</span>}
      <span>{displayText}</span>
    </div>
  );
};

export default SelectedVendorPill;
