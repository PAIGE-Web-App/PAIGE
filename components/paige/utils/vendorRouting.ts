/**
 * Vendor Routing Utilities
 * Smart routing logic for directing users to relevant vendor categories
 */

export interface VendorRoute {
  label: string;
  url: string;
}

/**
 * Get smart vendor routing based on todo name/category
 * Uses intelligent keyword matching to determine the right vendor category
 * 
 * @param todoName - The name of the todo item
 * @param location - Optional wedding location for location-based search
 * @param category - Optional todo category for additional context
 * @returns VendorRoute with label and URL, or null if no match
 */
export function getSmartVendorRoute(
  todoName: string,
  location?: string,
  category?: string
): VendorRoute | null {
  const name = todoName.toLowerCase();
  const locationParam = location ? `?location=${encodeURIComponent(location)}` : '';

  // Smart detection: "wedding band" could mean jewelry OR musicians
  if (name.includes('wedding band')) {
    // If mentions jewelry/rings/consultation = jewelry bands
    if (name.includes('jewelry') || name.includes('ring') || name.includes('consultation')) {
      return {
        label: 'Browse Jewelers',
        url: `/vendors/catalog/jewelry_store${locationParam}`
      };
    }
    // Otherwise = music bands
    return {
      label: 'Find Wedding Bands',
      url: `/vendors/catalog/band${locationParam}`
    };
  }

  // Jewelry and rings
  if (name.includes('ring') || name.includes('jewelry') || name.includes('jeweler')) {
    return {
      label: 'Browse Jewelers',
      url: `/vendors/catalog/jewelry_store${locationParam}`
    };
  }

  // Venue
  if (name.includes('venue') || name.includes('location')) {
    return {
      label: 'Browse Venues',
      url: `/vendors/catalog/wedding_venue${locationParam}`
    };
  }

  // Photography
  if (name.includes('photographer') || name.includes('photo')) {
    return {
      label: 'Find Photographers',
      url: `/vendors/catalog/photographer${locationParam}`
    };
  }

  // Catering and food
  if (name.includes('caterer') || name.includes('catering') || name.includes('food')) {
    return {
      label: 'Find Caterers',
      url: `/vendors/catalog/caterer${locationParam}`
    };
  }

  // Florist
  if (name.includes('florist') || name.includes('flower') || name.includes('floral')) {
    return {
      label: 'Browse Florists',
      url: `/vendors/catalog/florist${locationParam}`
    };
  }

  // Attire
  if (name.includes('dress') || name.includes('attire') || name.includes('bridal')) {
    return {
      label: 'Shop Attire',
      url: `/vendors/catalog/bridal_shop${locationParam}`
    };
  }

  // Suit/tuxedo
  if (name.includes('suit') || name.includes('tux')) {
    return {
      label: 'Browse Suits & Tuxes',
      url: `/vendors/catalog/suit_rental${locationParam}`
    };
  }

  // DJ
  if (name.includes('dj')) {
    return {
      label: 'Find DJs',
      url: `/vendors/catalog/dj${locationParam}`
    };
  }

  // Music and bands (general)
  if (name.includes('music') || name.includes('band') || name.includes('musician')) {
    return {
      label: 'Find Musicians',
      url: `/vendors/catalog/band${locationParam}`
    };
  }

  // Cake and bakery
  if (name.includes('cake') || name.includes('baker') || name.includes('bakery')) {
    return {
      label: 'Browse Bakeries',
      url: `/vendors/catalog/bakery${locationParam}`
    };
  }

  // Budget-related (not vendor-specific)
  if (name.includes('budget') || name.includes('cost')) {
    return {
      label: 'View Budget',
      url: '/budget'
    };
  }

  // Note: Timeline page is for day-of timeline, not planning suggestions
  // So we don't route timeline-related todos there

  // No match found
  return null;
}

/**
 * Get a simple action to view the task (fallback)
 */
export function getViewTaskRoute(): VendorRoute {
  return {
    label: 'View task',
    url: '#' // Will scroll to task instead
  };
}

