import React from 'react';

interface SelectedVendorPillProps {
  category: string;
  isSelectedVenue?: boolean;
}

// Category-specific colors for selected vendor pills
const getCategoryColor = (category: string, isSelectedVenue: boolean = false): string => {
  // Special color for selected venue
  if (isSelectedVenue) {
    return '#A85C36'; // Brown/terracotta for venue
  }

  // Category-specific colors
  const colorMap: { [key: string]: string } = {
    'Photographer': '#2F4F4F',      // Dark slate gray
    'Florist': '#FF69B4',           // Hot pink
    'Caterer': '#8B4513',           // Saddle brown
    'DJ/Band': '#32CD32',           // Lime green
    'Officiant': '#8A2BE2',         // Blue violet
    'Beauty Salon': '#FF1493',      // Deep pink
    'Jeweler': '#FFD700',           // Gold
    'Venue': '#A85C36',             // Brown/terracotta
    'Transportation': '#4169E1',    // Royal blue
    'Wedding Planner': '#00CED1',   // Dark turquoise
    'Stationery': '#DC143C',        // Crimson
    'Music': '#32CD32',             // Lime green
    'Entertainment': '#32CD32',     // Lime green
    'Photography': '#2F4F4F',       // Dark slate gray
    'Videography': '#2F4F4F',       // Dark slate gray
    'Attire': '#8A2BE2',            // Blue violet
    'Beauty': '#FF1493',            // Deep pink
    'Flowers': '#FF69B4',           // Hot pink
    'Decor': '#FF69B4',             // Hot pink
    'Food': '#8B4513',              // Saddle brown
    'Catering': '#8B4513',          // Saddle brown
    'Rings': '#FFD700',             // Gold
    'Jewelry': '#FFD700',           // Gold
    'Health': '#FF1493',            // Deep pink
    'Miscellaneous': '#696969'      // Dim gray
  };

  // Try exact match first
  if (colorMap[category]) {
    return colorMap[category];
  }

  // Try partial matches for common variations
  for (const [key, color] of Object.entries(colorMap)) {
    if (category.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(category.toLowerCase())) {
      return color;
    }
  }

  // Default color
  return '#696969';
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
  isSelectedVenue = false 
}) => {
  const backgroundColor = getCategoryColor(category, isSelectedVenue);
  const icon = getCategoryIcon(category, isSelectedVenue);
  const displayText = isSelectedVenue ? 'Selected Venue' : `Selected ${category}`;

  return (
    <div
      className="inline-flex items-center gap-1 text-white px-2 py-1 rounded-full text-xs font-medium mb-2"
      style={{ backgroundColor }}
    >
      <span className="text-xs">{icon}</span>
      <span>{displayText}</span>
    </div>
  );
};

export default SelectedVendorPill;
