/**
 * Vendor Search Category Mapping System
 * 
 * This file contains the centralized category mapping logic for vendor search functionality.
 * This system is CRITICAL for ensuring vendor search works correctly across all categories.
 * 
 * ⚠️ CRITICAL: When modifying these mappings, you MUST:
 * 1. Update the categoryToGoogleTypes mapping
 * 2. Update the validation function
 * 3. Update the documentation
 * 4. Run the validation script
 */

/**
 * Maps contact category names (from dropdown) to Google Places API types
 * This mapping is used in AddContactModal, EditContactModal, and other vendor search components
 */
export const VENDOR_SEARCH_CATEGORY_MAPPINGS: Record<string, string[]> = {
  'Jeweler': ['jewelry_store'],
  'Florist': ['florist'],
  'Bakeries & Cakes': ['bakery'],
  'Venue': ['wedding_venue', 'event_venue', 'banquet_hall'],
  'Hair & Beauty': ['hair_care'],
  'Photographer': ['photographer'],
  'Videographer': ['videographer'],
  'Beauty Salon': ['beauty_salon'],
  'Spa': ['spa'],
  'DJ': ['dj'],
  'Band': ['band'],
  'Wedding Planner': ['wedding_planner'],
  'Caterer': ['caterer'],
  'Car Rental': ['car_rental'],
  'Travel Agency': ['travel_agency'],
  'Officiant': ['officiant'],
  'Suit & Tux Rental': ['suit_rental'],
  'Makeup Artist': ['makeup_artist'],
  'Stationery & Invitations': ['stationery'],
  'Event Rental': ['rentals'],
  'Wedding Favor': ['favors'],
  'Transportation': ['car_rental']
};

/**
 * Gets relevant Google Places API categories for a contact category
 * @param contactCategory - The category selected from the dropdown
 * @returns Array of Google Places API types to search for
 */
export const getRelevantCategories = (contactCategory: string): string[] => {
  // If no category is selected, search across all wedding vendor categories
  if (!contactCategory || contactCategory === '') {
    return [
      'florist',
      'jewelry_store',
      'bakery',
      'wedding_venue',
      'event_venue',
      'banquet_hall',
      'hair_care',
      'photographer',
      'videographer',
      'beauty_salon',
      'spa',
      'dj',
      'band',
      'wedding_planner',
      'caterer',
      'car_rental',
      'travel_agency',
      'officiant',
      'suit_rental',
      'makeup_artist',
      'stationery',
      'rentals',
      'favors'
    ];
  }

  // Get the relevant Google Places types for this category
  const relevantTypes = VENDOR_SEARCH_CATEGORY_MAPPINGS[contactCategory] || [];
  
  // If we have specific types, use them; otherwise fall back to all categories
  return relevantTypes.length > 0 ? relevantTypes : [
    'florist',
    'jewelry_store',
    'bakery',
    'wedding_venue',
    'event_venue',
    'banquet_hall',
    'hair_care',
    'photographer',
    'videographer',
    'beauty_salon',
    'spa',
    'dj',
    'band',
    'wedding_planner',
    'caterer',
    'car_rental',
    'travel_agency',
    'officiant',
    'suit_rental',
    'makeup_artist',
    'stationery',
    'rentals',
    'favors'
  ];
};

/**
 * Validates that all category mappings are consistent and complete
 * @returns Object with validation results
 */
export const validateVendorSearchMappings = (): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingMappings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingMappings: string[] = [];

  // Get all possible contact categories from the dropdown
  const allContactCategories = [
    'Photographer', 'Caterer', 'Florist', 'DJ', 'Venue', 'Wedding Planner', 
    'Officiant', 'Baker', 'Suit/Tux Rental', 'Hair Stylist', 
    'Makeup Artist', 'Musician', 'Stationery', 'Transportation', 'Rentals', 
    'Favors', 'Jeweler', 'Videographer', 'Beauty Salon', 'Spa', 'Travel Agency', 
    'Car Rental'
  ];

  // Check for missing mappings
  allContactCategories.forEach(category => {
    if (!VENDOR_SEARCH_CATEGORY_MAPPINGS[category]) {
      missingMappings.push(category);
      errors.push(`Missing mapping for contact category: "${category}"`);
    }
  });

  // Check for orphaned mappings (mappings that don't correspond to any contact category)
  const mappedCategories = Object.keys(VENDOR_SEARCH_CATEGORY_MAPPINGS);
  mappedCategories.forEach(mappedCategory => {
    if (!allContactCategories.includes(mappedCategory)) {
      warnings.push(`Orphaned mapping: "${mappedCategory}" (not in contact categories list)`);
    }
  });

  // Validate that all Google Places types are valid
  const validGooglePlacesTypes = [
    'florist', 'jewelry_store', 'bakery', 'wedding_venue', 'event_venue', 'banquet_hall', 'hair_care', 
    'photographer', 'videographer', 'beauty_salon', 
    'spa', 'dj', 'band', 'wedding_planner', 'caterer', 'car_rental', 
    'travel_agency', 'officiant', 'suit_rental', 'makeup_artist', 
    'stationery', 'rentals', 'favors'
  ];

  Object.entries(VENDOR_SEARCH_CATEGORY_MAPPINGS).forEach(([contactCategory, googleTypes]) => {
    googleTypes.forEach(googleType => {
      if (!validGooglePlacesTypes.includes(googleType)) {
        errors.push(`Invalid Google Places type "${googleType}" for contact category "${contactCategory}"`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingMappings
  };
};

/**
 * Gets all available contact categories (for dropdown population)
 * @returns Array of contact category names
 */
export const getAllContactCategories = (): string[] => {
  return [
    'Photographer', 'Caterer', 'Florist', 'DJ', 'Venue', 'Wedding Planner', 
    'Officiant', 'Baker', 'Suit/Tux Rental', 'Hair Stylist', 
    'Makeup Artist', 'Musician', 'Stationery', 'Transportation', 'Rentals', 
    'Favors', 'Jeweler', 'Videographer', 'Beauty Salon', 'Spa', 'Travel Agency', 
    'Car Rental'
  ];
};

/**
 * Gets all valid Google Places API types
 * @returns Array of valid Google Places types
 */
export const getAllGooglePlacesTypes = (): string[] => {
  return [
    'florist', 'jewelry_store', 'bakery', 'wedding_venue', 'event_venue', 'banquet_hall', 'hair_care', 
    'photographer', 'videographer', 'beauty_salon', 
    'spa', 'dj', 'band', 'wedding_planner', 'caterer', 'car_rental', 
    'travel_agency', 'officiant', 'suit_rental', 'makeup_artist', 
    'stationery', 'rentals', 'favors'
  ];
}; 