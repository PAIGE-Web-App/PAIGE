import React from 'react';
import { 
  Camera, 
  Flower, 
  Cake, 
  Building2, 
  Scissors, 
  Dress, 
  Sparkles, 
  Car, 
  Plane, 
  Calendar, 
  User, 
  Music, 
  Palette, 
  FileText, 
  Gift, 
  Suitcase, 
  Heart,
  MapPin,
  Star,
  Users,
  Briefcase,
  Home,
  Church,
  Crown,
  Gem,
  Utensils,
  Truck,
  Palette as MakeupPalette,
  BookOpen,
  PartyPopper,
  Microphone,
  Guitar
} from 'lucide-react';

// Category to icon mapping
export const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  // Venues
  'Venue': Building2,
  'Reception Venue': Building2,
  'Church': Church,
  'Night Club': Music,
  
  // Food & Beverage
  'Baker': Cake,
  'Caterer': Utensils,
  
  // Jewelry & Accessories
  'Jeweler': Gem,
  'Jewelry': Gem,
  
  // Beauty & Styling
  'Hair Stylist': Scissors,
  'Beauty Salon': Sparkles,
  'Spa': Heart,
  'Makeup Artist': MakeupPalette,
  
  // Attire
  'Dress Shop': Dress,
  'Bridal Salon': Dress,
  'Suit & Tux Rental': Suitcase,
  'Suit/Tux Rental': Suitcase,
  
  // Photography & Video
  'Photographer': Camera,
  'Videographer': Camera,
  
  // Flowers & Decor
  'Florist': Flower,
  'Florist': Flower,
  
  // Entertainment
  'DJ': Microphone,
  'Band': Guitar,
  'Musician': Guitar,
  
  // Planning & Services
  'Wedding Planner': Calendar,
  'Officiant': User,
  'Travel Agency': Plane,
  
  // Transportation
  'Car Rental': Car,
  'Transportation': Car,
  
  // Supplies & Extras
  'Stationery': FileText,
  'Stationery & Invitations': FileText,
  'Event Rental': Briefcase,
  'Rentals': Briefcase,
  'Wedding Favor': Gift,
  'Favors': Gift,
  
  // Default fallback
  'Vendor': MapPin
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

// Category color mapping for consistent theming
export const CATEGORY_COLORS: Record<string, string> = {
  // Venues - Blue
  'Venue': '#3B82F6',
  'Reception Venue': '#3B82F6',
  'Church': '#3B82F6',
  'Night Club': '#3B82F6',
  
  // Food & Beverage - Orange
  'Baker': '#F97316',
  'Caterer': '#F97316',
  
  // Jewelry & Accessories - Purple
  'Jeweler': '#8B5CF6',
  'Jewelry': '#8B5CF6',
  
  // Beauty & Styling - Pink
  'Hair Stylist': '#EC4899',
  'Beauty Salon': '#EC4899',
  'Spa': '#EC4899',
  'Makeup Artist': '#EC4899',
  
  // Attire - Rose
  'Dress Shop': '#F43F5E',
  'Bridal Salon': '#F43F5E',
  'Suit & Tux Rental': '#F43F5E',
  'Suit/Tux Rental': '#F43F5E',
  
  // Photography & Video - Indigo
  'Photographer': '#6366F1',
  'Videographer': '#6366F1',
  
  // Flowers & Decor - Green
  'Florist': '#10B981',
  
  // Entertainment - Yellow
  'DJ': '#EAB308',
  'Band': '#EAB308',
  'Musician': '#EAB308',
  
  // Planning & Services - Teal
  'Wedding Planner': '#14B8A6',
  'Officiant': '#14B8A6',
  'Travel Agency': '#14B8A6',
  
  // Transportation - Gray
  'Car Rental': '#6B7280',
  'Transportation': '#6B7280',
  
  // Supplies & Extras - Amber
  'Stationery': '#F59E0B',
  'Stationery & Invitations': '#F59E0B',
  'Event Rental': '#F59E0B',
  'Rentals': '#F59E0B',
  'Wedding Favor': '#F59E0B',
  'Favors': '#F59E0B',
  
  // Default
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