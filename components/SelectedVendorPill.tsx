import React from 'react';
import { getCategoryHexColor } from '@/utils/categoryStyle';

interface SelectedVendorPillProps {
  category: string;
  isSelectedVenue?: boolean;
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

// Category-specific icons
const getCategoryIcon = (category: string, isSelectedVenue: boolean = false): string => {
  if (isSelectedVenue) {
    return '🏛️';
  }

  const iconMap: { [key: string]: string } = {
    'Photographer': '📸',
    'Florist': '🌸',
    'Caterer': '🍽️',
    'DJ/Band': '🎵',
    'Officiant': '💒',
    'Beauty Salon': '💄',
    'Jeweler': '💍',
    'Venue': '🏛️',
    'Transportation': '🚗',
    'Wedding Planner': '📋',
    'Stationery': '📝',
    'Music': '🎵',
    'Entertainment': '🎭',
    'Photography': '📸',
    'Videography': '🎥',
    'Attire': '👗',
    'Beauty': '💄',
    'Flowers': '🌸',
    'Decor': '🎨',
    'Food': '🍽️',
    'Catering': '🍽️',
    'Rings': '💍',
    'Jewelry': '💍',
    'Health': '💄',
    'Miscellaneous': '⭐'
  };

  // Try exact match first
  if (iconMap[category]) {
    return iconMap[category];
  }

  // Try partial matches
  for (const [key, icon] of Object.entries(iconMap)) {
    if (category.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(category.toLowerCase())) {
      return icon;
    }
  }

  // Default icon
  return '⭐';
};

const SelectedVendorPill: React.FC<SelectedVendorPillProps> = ({ 
  category, 
  isSelectedVenue = false,
  onClick,
  clickable = false
}) => {
  const backgroundColor = getCategoryColor(category, isSelectedVenue);
  const icon = getCategoryIcon(category, isSelectedVenue);
  const displayText = isSelectedVenue ? 'Selected Venue' : `Selected ${category}`;

  return (
    <div
      className={`inline-flex items-center gap-1 text-white px-2 py-1 rounded-full text-xs font-medium mb-2 ${
        clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
      }`}
      style={{ backgroundColor }}
      onClick={clickable ? onClick : undefined}
      title={clickable ? 'Click to update category' : undefined}
    >
      <span className="text-xs">{icon}</span>
      <span>{displayText}</span>
    </div>
  );
};

export default SelectedVendorPill;
