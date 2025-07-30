import React from 'react';
import { Grid2x2 } from 'lucide-react';

// Use one consistent icon for all categories
export const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  // All categories use the same icon for consistency
  'Venue': Grid2x2,
  'Reception Venue': Grid2x2,
  'Church': Grid2x2,
  'Night Club': Grid2x2,
  'Baker': Grid2x2,
  'Caterer': Grid2x2,
  'Jeweler': Grid2x2,
  'Jewelry': Grid2x2,
  'Hair Stylist': Grid2x2,
  'Beauty Salon': Grid2x2,
  'Spa': Grid2x2,
  'Makeup Artist': Grid2x2,
  'Dress Shop': Grid2x2,
  'Bridal Salon': Grid2x2,
  'Suit & Tux Rental': Grid2x2,
  'Suit/Tux Rental': Grid2x2,
  'Photographer': Grid2x2,
  'Videographer': Grid2x2,
  'Florist': Grid2x2,
  'DJ': Grid2x2,
  'Band': Grid2x2,
  'Musician': Grid2x2,
  'Wedding Planner': Grid2x2,
  'Officiant': Grid2x2,
  'Travel Agency': Grid2x2,
  'Car Rental': Grid2x2,
  'Transportation': Grid2x2,
  'Stationery': Grid2x2,
  'Stationery & Invitations': Grid2x2,
  'Event Rental': Grid2x2,
  'Rentals': Grid2x2,
  'Wedding Favor': Grid2x2,
  'Favors': Grid2x2,
  'Vendor': Grid2x2
};

// Get icon component for a category
export const getCategoryIcon = (category: string): React.ComponentType<any> => {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS['Vendor'];
};

// Get icon with consistent styling
export const CategoryIcon = ({ 
  category, 
  className = "w-3 h-3 text-[#A85C36]", 
  ...props 
}: { 
  category: string; 
  className?: string; 
  [key: string]: any;
}) => {
  const IconComponent = getCategoryIcon(category);
  return <IconComponent className={className} {...props} />;
};

// Use one consistent color for all categories
export const CATEGORY_COLORS: Record<string, string> = {
  // All categories use the same color for consistency
  'Venue': '#A85C36',
  'Reception Venue': '#A85C36',
  'Church': '#A85C36',
  'Night Club': '#A85C36',
  'Baker': '#A85C36',
  'Caterer': '#A85C36',
  'Jeweler': '#A85C36',
  'Jewelry': '#A85C36',
  'Hair Stylist': '#A85C36',
  'Beauty Salon': '#A85C36',
  'Spa': '#A85C36',
  'Makeup Artist': '#A85C36',
  'Dress Shop': '#A85C36',
  'Bridal Salon': '#A85C36',
  'Suit & Tux Rental': '#A85C36',
  'Suit/Tux Rental': '#A85C36',
  'Photographer': '#A85C36',
  'Videographer': '#A85C36',
  'Florist': '#A85C36',
  'DJ': '#A85C36',
  'Band': '#A85C36',
  'Musician': '#A85C36',
  'Wedding Planner': '#A85C36',
  'Officiant': '#A85C36',
  'Travel Agency': '#A85C36',
  'Car Rental': '#A85C36',
  'Transportation': '#A85C36',
  'Stationery': '#A85C36',
  'Stationery & Invitations': '#A85C36',
  'Event Rental': '#A85C36',
  'Rentals': '#A85C36',
  'Wedding Favor': '#A85C36',
  'Favors': '#A85C36',
  'Vendor': '#A85C36'
};

// Get color for a category
export const getCategoryColor = (category: string): string => {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Vendor'];
};

// Category icon with color
export const CategoryIconWithColor = ({ 
  category, 
  className = "w-3 h-3", 
  ...props 
}: { 
  category: string; 
  className?: string; 
  [key: string]: any;
}) => {
  const IconComponent = getCategoryIcon(category);
  const color = getCategoryColor(category);
  
  return (
    <IconComponent 
      className={className} 
      style={{ color }} 
      {...props} 
    />
  );
}; 