// utils/vendorUtils.ts

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
    'Reception Venue': 'restaurant',
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

// Helper function to convert URL slug back to display category
export const getCategoryFromSlug = (slug: string): string => {
  const slugToCategory: Record<string, string> = {
    'restaurant': 'Reception Venue',
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
    
    // Keep only last 12 vendors
    const trimmed = recent.slice(0, 12);
    
    localStorage.setItem('paige_recently_viewed_vendors', JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving recently viewed vendor:', error);
  }
};

// Vendor data conversion utility
export const convertVendorToCatalogFormat = (vendor: any, recentlyViewed?: any[]) => {
  // Try to get the Google Places image from recently viewed data
  const recent = recentlyViewed || getRecentlyViewedVendors();
  const recentlyViewedVendor = recent.find(rv => 
    rv.id === vendor.placeId || rv.id === vendor.id || rv.placeId === vendor.placeId
  );
  
  // Prioritize Google Places images from Firestore, then recently viewed data
  const bestImage = vendor.image || 
                   vendor.images?.[0] || 
                   recentlyViewedVendor?.image || 
                   recentlyViewedVendor?.images?.[0] || 
                   '/Venue.png';
  
  console.log('🔄 Converting vendor to catalog format:', {
    vendorName: vendor.name,
    vendorImage: vendor.image,
    vendorPlaceId: vendor.placeId,
    recentlyViewedVendor: recentlyViewedVendor ? {
      name: recentlyViewedVendor.name,
      image: recentlyViewedVendor.image,
      id: recentlyViewedVendor.id
    } : null,
    bestImage: bestImage,
    finalImage: bestImage
  });
  
  return {
    id: vendor.placeId || vendor.id,
    name: vendor.name,
    address: vendor.address,
    location: vendor.address,
    rating: vendor.rating || recentlyViewedVendor?.rating || 0,
    reviewCount: vendor.reviewCount || recentlyViewedVendor?.reviewCount || 0,
    price: vendor.price || recentlyViewedVendor?.price || '',
    mainTypeLabel: vendor.category,
    image: bestImage,
    source: vendor.source || recentlyViewedVendor?.source || { name: 'Manual Entry', url: '' },
    estimate: vendor.estimate || '',
    phone: vendor.phone,
    email: vendor.email
  };
}; 