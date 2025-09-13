// utils/vendorUtils.ts
import { getVendorImageImmediate } from './vendorImageUtils';

// ============================================================================
// CATEGORY MAPPING SYSTEM - CRITICAL FOR BREADCRUMB CONSISTENCY
// ============================================================================
// 
// IMPORTANT: This system ensures consistent category formatting across the app.
// Any changes to category mappings must be made in ALL THREE places:
// 1. getCategorySlug() - converts display category to URL slug
// 2. getCategoryFromSlug() - converts URL slug back to display category  
// 3. getCategoryLabel() - converts display category to plural form
//
// VALIDATION: Run validateCategoryMappings() to ensure all mappings are consistent.
// ============================================================================

// Helper function to detect if a venue is likely a wedding venue based on name
export const isLikelyWeddingVenue = (name: string): boolean => {
  const venueKeywords = [
    'vineyard', 'winery', 'estate', 'mansion', 'manor', 'castle', 'palace',
    'garden', 'farm', 'ranch', 'barn', 'lodge', 'resort', 'hotel', 'inn',
    'club', 'hall', 'center', 'venue', 'wedding', 'events', 'reception',
    'ballroom', 'terrace', 'pavilion', 'gazebo', 'chapel', 'church'
  ];
  
  const lowerName = name.toLowerCase();
  return venueKeywords.some(keyword => lowerName.includes(keyword));
};

export const mapGoogleTypesToCategory = (types: string[], venueName?: string): string => {
  if (!types || types.length === 0) return 'Venue';
  
  // First, try to determine category from the vendor name
  if (venueName) {
    const lowerName = venueName.toLowerCase();
    
    // Check for specific vendor types in the name
    if (lowerName.includes('officiant') || lowerName.includes('minister') || lowerName.includes('pastor') || lowerName.includes('priest')) {
      return 'Officiant';
    }
    if (lowerName.includes('church') || lowerName.includes('chapel') || lowerName.includes('cathedral')) {
      return 'Church';
    }
    if (lowerName.includes('photographer') || lowerName.includes('photo')) {
      return 'Photographer';
    }
    if (lowerName.includes('florist') || lowerName.includes('flower')) {
      return 'Florist';
    }
    if (lowerName.includes('caterer') || lowerName.includes('catering')) {
      return 'Caterer';
    }
    if (lowerName.includes('dj') || lowerName.includes('disc jockey')) {
      return 'DJ';
    }
    if (lowerName.includes('band') || lowerName.includes('musician')) {
      return 'Band';
    }
    if (lowerName.includes('planner') || lowerName.includes('coordinator')) {
      return 'Wedding Planner';
    }
    if (lowerName.includes('salon') || lowerName.includes('hair') || lowerName.includes('beauty')) {
      return 'Beauty Salon';
    }
    if (lowerName.includes('dress') || lowerName.includes('bridal') || lowerName.includes('gown')) {
      return 'Dress Shop';
    }
    if (lowerName.includes('jewelry') || lowerName.includes('jeweler')) {
      return 'Jeweler';
    }
    if (lowerName.includes('bakery') || lowerName.includes('cake')) {
      return 'Baker';
    }
    if (lowerName.includes('rental') || lowerName.includes('rent')) {
      return 'Event Rental';
    }
    if (lowerName.includes('car') || lowerName.includes('transport')) {
      return 'Car Rental';
    }
    if (lowerName.includes('travel') || lowerName.includes('agency')) {
      return 'Travel Agency';
    }
    if (lowerName.includes('spa')) {
      return 'Spa';
    }
    if (lowerName.includes('makeup') || lowerName.includes('artist')) {
      return 'Makeup Artist';
    }
    if (lowerName.includes('stationery') || lowerName.includes('invitation')) {
      return 'Stationery';
    }
    if (lowerName.includes('favor')) {
      return 'Wedding Favor';
    }
    if (lowerName.includes('suit') || lowerName.includes('tux')) {
      return 'Suit & Tux Rental';
    }
  }
  
  // If name doesn't help, try Google Places types
  const typeMap: Record<string, string> = {
    'restaurant': 'Reception Venue',
    'bakery': 'Baker',
    'jewelry_store': 'Jeweler',
    'hair_care': 'Hair Stylist',
    'clothing_store': 'Dress Shop',
    'beauty_salon': 'Beauty Salon',
    'spa': 'Spa',
    'photographer': 'Photographer',
    'florist': 'Florist',
    'caterer': 'Caterer',
    'car_rental': 'Car Rental',
    'travel_agency': 'Travel Agency',
    'wedding_planner': 'Wedding Planner',
    'officiant': 'Officiant',
    'suit_rental': 'Suit & Tux Rental',
    'makeup_artist': 'Makeup Artist',
    'stationery': 'Stationery',
    'rentals': 'Event Rental',
    'favors': 'Wedding Favor',
    'band': 'Band',
    'dj': 'DJ',
    'church': 'Church',
    'place_of_worship': 'Church',
    'lodging': 'Venue',
    'tourist_attraction': 'Venue',
    'amusement_park': 'Venue',
    'aquarium': 'Venue',
    'art_gallery': 'Venue',
    'museum': 'Venue',
    'park': 'Venue',
    'zoo': 'Venue',
    'bar': 'Venue',
    'night_club': 'Night Club',
    'casino': 'Venue',
    'movie_theater': 'Venue',
    'stadium': 'Venue',
    'convention_center': 'Venue',
    'conference_center': 'Venue',
    'banquet_hall': 'Venue',
    'event_venue': 'Venue',
    'wedding_venue': 'Venue',
    'reception_venue': 'Reception Venue'
  };
  
  // Try to match specific types
  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }
  
  // Default to Venue for anything else
  return 'Venue';
};

// Helper function to convert category name to URL slug
export const categoryToSlug = (category: string): string => {
  return category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Helper function to map display category back to Google Places type for URL
export const getCategorySlug = (displayCategory: string): string => {
  const categoryToGoogleType: Record<string, string> = {
    'Venue': 'restaurant', // Map Venue to restaurant (reception venues)
    'Church': 'church',
    'Night Club': 'night_club',
    'Baker': 'bakery',
    'Jeweler': 'jewelry_store',
    'Hair Stylist': 'hair_care',
    'Dress Shop': 'clothing_store',
    'Beauty Salon': 'beauty_salon',
    'Spa': 'spa',
    'Photographer': 'photographer',
    'Florist': 'florist',
    'Caterer': 'caterer',
    'Car Rental': 'car_rental',
    'Travel Agency': 'travel_agency',
    'Wedding Planner': 'wedding_planner',
    'Officiant': 'officiant',
    'Suit & Tux Rental': 'suit_rental',
    'Makeup Artist': 'makeup_artist',
    'Stationery': 'stationery',
    'Event Rental': 'rentals',
    'Wedding Favor': 'favors',
    'Band': 'band',
    'DJ': 'dj'
  };
  
  return categoryToGoogleType[displayCategory] || categoryToSlug(displayCategory);
};

// Helper function to convert URL slug back to display category
export const getCategoryFromSlug = (slug: string): string => {
  const slugToCategory: Record<string, string> = {
    'restaurant': 'Venue', // Changed to match vendorCategories.ts
    'church': 'Church',
    'night_club': 'Night Club',
    'bakery': 'Baker',
    'jewelry_store': 'Jeweler',
    'hair_care': 'Hair Stylist',
    'clothing_store': 'Dress Shop',
    'beauty_salon': 'Beauty Salon',
    'spa': 'Spa',
    'photographer': 'Photographer',
    'florist': 'Florist',
    'caterer': 'Caterer',
    'car_rental': 'Car Rental',
    'travel_agency': 'Travel Agency',
    'wedding_planner': 'Wedding Planner',
    'officiant': 'Officiant',
    'suit_rental': 'Suit & Tux Rental',
    'makeup_artist': 'Makeup Artist',
    'stationery': 'Stationery',
    'rentals': 'Event Rental',
    'favors': 'Wedding Favor',
    'band': 'Band',
    'dj': 'DJ'
  };
  
  return slugToCategory[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Helper function to get the plural form for breadcrumb consistency
export const getCategoryLabel = (displayCategory: string): string => {
  const categoryToPlural: Record<string, string> = {
    'Venue': 'Venues',
    'Reception Venue': 'Reception Venues',
    'Church': 'Churches',
    'Night Club': 'Night Clubs',
    'Baker': 'Bakeries & Cakes',
    'Jeweler': 'Jewelers',
    'Hair Stylist': 'Hair & Beauty',
    'Dress Shop': 'Bridal Salons',
    'Beauty Salon': 'Beauty Salons',
    'Spa': 'Spas',
    'Photographer': 'Photographers',
    'Florist': 'Florists',
    'Caterer': 'Catering',
    'Car Rental': 'Car Rentals',
    'Travel Agency': 'Travel Agencies',
    'Wedding Planner': 'Wedding Planners',
    'Officiant': 'Officiants',
    'Suit & Tux Rental': 'Suit & Tux Rentals',
    'Makeup Artist': 'Makeup Artists',
    'Stationery': 'Stationery & Invitations',
    'Event Rental': 'Event Rentals',
    'Wedding Favor': 'Wedding Favors',
    'Band': 'Bands',
    'DJ': 'DJs'
  };
  
  return categoryToPlural[displayCategory] || displayCategory;
};

// ============================================================================
// VALIDATION AND MAINTENANCE FUNCTIONS
// ============================================================================

/**
 * Validates that all category mappings are consistent across all three functions.
 * Run this function to ensure no mapping inconsistencies exist.
 * 
 * @returns {Object} Validation results with any inconsistencies found
 */
export const validateCategoryMappings = (): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingMappings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingMappings: string[] = [];

  // Get all unique categories from all three mappings
  const slugToCategory = {
    'restaurant': 'Venue', // Updated to match vendorCategories.ts
    'church': 'Church',
    'night_club': 'Night Club',
    'bakery': 'Baker',
    'jewelry_store': 'Jeweler',
    'hair_care': 'Hair Stylist',
    'clothing_store': 'Dress Shop',
    'beauty_salon': 'Beauty Salon',
    'spa': 'Spa',
    'photographer': 'Photographer',
    'florist': 'Florist',
    'caterer': 'Caterer',
    'car_rental': 'Car Rental',
    'travel_agency': 'Travel Agency',
    'wedding_planner': 'Wedding Planner',
    'officiant': 'Officiant',
    'suit_rental': 'Suit & Tux Rental',
    'makeup_artist': 'Makeup Artist',
    'stationery': 'Stationery',
    'rentals': 'Event Rental',
    'favors': 'Wedding Favor',
    'band': 'Band',
    'dj': 'DJ'
  };

  const categoryToSlug = {
    'Venue': 'restaurant',
    'Church': 'church',
    'Night Club': 'night_club',
    'Baker': 'bakery',
    'Jeweler': 'jewelry_store',
    'Hair Stylist': 'hair_care',
    'Dress Shop': 'clothing_store',
    'Beauty Salon': 'beauty_salon',
    'Spa': 'spa',
    'Photographer': 'photographer',
    'Florist': 'florist',
    'Caterer': 'caterer',
    'Car Rental': 'car_rental',
    'Travel Agency': 'travel_agency',
    'Wedding Planner': 'wedding_planner',
    'Officiant': 'officiant',
    'Suit & Tux Rental': 'suit_rental',
    'Makeup Artist': 'makeup_artist',
    'Stationery': 'stationery',
    'Event Rental': 'rentals',
    'Wedding Favor': 'favors',
    'Band': 'band',
    'DJ': 'dj'
  };

  const categoryToPlural = {
    'Venue': 'Venues',
    'Church': 'Churches',
    'Night Club': 'Night Clubs',
    'Baker': 'Bakeries & Cakes',
    'Jeweler': 'Jewelers',
    'Hair Stylist': 'Hair & Beauty',
    'Dress Shop': 'Bridal Salons',
    'Beauty Salon': 'Beauty Salons',
    'Spa': 'Spas',
    'Photographer': 'Photographers',
    'Florist': 'Florists',
    'Caterer': 'Catering',
    'Car Rental': 'Car Rentals',
    'Travel Agency': 'Travel Agencies',
    'Wedding Planner': 'Wedding Planners',
    'Officiant': 'Officiants',
    'Suit & Tux Rental': 'Suit & Tux Rentals',
    'Makeup Artist': 'Makeup Artists',
    'Stationery': 'Stationery & Invitations',
    'Event Rental': 'Event Rentals',
    'Wedding Favor': 'Wedding Favors',
    'Band': 'Bands',
    'DJ': 'DJs'
  };

  // Check for bidirectional consistency
  for (const [slug, category] of Object.entries(slugToCategory)) {
    if (categoryToSlug[category] !== slug) {
      errors.push(`Inconsistent mapping: ${slug} -> ${category} but ${category} -> ${categoryToSlug[category]}`);
    }
  }

  // Check for missing plural mappings
  for (const category of Object.values(slugToCategory)) {
    if (!categoryToPlural[category]) {
      missingMappings.push(`Missing plural mapping for: ${category}`);
    }
  }

  // Check for orphaned mappings (excluding special cases like 'Venue' which maps to 'restaurant')
  for (const category of Object.keys(categoryToPlural)) {
    if (!Object.values(slugToCategory).includes(category)) {
      // Special case: 'Venue' maps to 'restaurant' slug, so it's not orphaned
      if (category !== 'Venue') {
        warnings.push(`Orphaned plural mapping: ${category} (not in slug mappings)`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingMappings
  };
};

/**
 * Gets all available categories in a structured format for easy reference.
 * Useful for building category selectors or validating user input.
 */
export const getAllCategories = (): {
  slugs: string[];
  displayNames: string[];
  pluralNames: string[];
  mappings: Array<{ slug: string; display: string; plural: string }>;
} => {
  const slugToCategory = {
    'restaurant': 'Venue', // Updated to match vendorCategories.ts
    'church': 'Church',
    'night_club': 'Night Club',
    'bakery': 'Baker',
    'jewelry_store': 'Jeweler',
    'hair_care': 'Hair Stylist',
    'clothing_store': 'Dress Shop',
    'beauty_salon': 'Beauty Salon',
    'spa': 'Spa',
    'photographer': 'Photographer',
    'florist': 'Florist',
    'caterer': 'Caterer',
    'car_rental': 'Car Rental',
    'travel_agency': 'Travel Agency',
    'wedding_planner': 'Wedding Planner',
    'officiant': 'Officiant',
    'suit_rental': 'Suit & Tux Rental',
    'makeup_artist': 'Makeup Artist',
    'stationery': 'Stationery',
    'rentals': 'Event Rental',
    'favors': 'Wedding Favor',
    'band': 'Band',
    'dj': 'DJ'
  };

  const mappings = Object.entries(slugToCategory).map(([slug, display]) => ({
    slug,
    display,
    plural: getCategoryLabel(display)
  }));

  return {
    slugs: Object.keys(slugToCategory),
    displayNames: Object.values(slugToCategory),
    pluralNames: Object.values(slugToCategory).map(getCategoryLabel),
    mappings
  };
};

// Recently viewed tracking functions
export const getRecentlyViewedVendors = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
  } catch {
    return [];
  }
};

export const addRecentlyViewedVendor = (vendor: any) => {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentlyViewedVendors();
    const existingIndex = recent.findIndex(v => v.id === vendor.id);
    
    // Remove if already exists
    if (existingIndex > -1) {
      recent.splice(existingIndex, 1);
    }
    
    // Add to beginning (most recent first)
    recent.unshift({
      ...vendor,
      viewedAt: new Date().toISOString()
    });
    
    // Keep only last 10 vendors
    const trimmed = recent.slice(0, 10);
    
    localStorage.setItem('paige_recently_viewed_vendors', JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving recently viewed vendor:', error);
  }
};

// Vendor data conversion utility
export const convertVendorToCatalogFormat = (vendor: any, recentlyViewed?: any[]) => {
  // Check if vendor is null or undefined
  if (!vendor) {
    return null;
  }
  
  // Try to get the Google Places image from recently viewed data
  const recent = recentlyViewed || getRecentlyViewedVendors();
  const recentlyViewedVendor = recent.find(rv => 
    rv.id === vendor.placeId || rv.id === vendor.id || rv.placeId === vendor.placeId
  );
  
  // Use unified image handling
  const vendorWithRecentData = {
    ...vendor,
    // Merge with recently viewed data for better image selection
    image: vendor.image || recentlyViewedVendor?.image,
    images: vendor.images || recentlyViewedVendor?.images
  };
  
  const bestImage = getVendorImageImmediate(vendorWithRecentData);
  

  
  return {
    id: vendor.placeId || vendor.id,
    name: vendor.name,
    address: vendor.address,
    location: vendor.address,
    rating: vendor.rating || recentlyViewedVendor?.rating || 0,
    reviewCount: vendor.reviewCount || vendor.user_ratings_total || recentlyViewedVendor?.reviewCount || recentlyViewedVendor?.user_ratings_total || 0,
    price: vendor.price || recentlyViewedVendor?.price || '',
    mainTypeLabel: vendor.category,
    image: bestImage,
    source: vendor.source || recentlyViewedVendor?.source || { name: 'Manual Entry', url: '' },
    estimate: vendor.estimate || '',
    phone: vendor.phone,
    email: vendor.email
  };
}; 