export interface VendorCategory {
  value: string;
  label: string;
  singular: string;
  icon: any; // Lucide icon component
}

export interface Vendor {
  id?: string; // Optional for Google Places API results
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  price_level?: number;
  types?: string[];
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now?: boolean;
  };
  image?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  instagram?: {
    handle: string;
    url: string;
    confidence: 'high' | 'medium' | 'low';
    scrapedAt?: string;
    scrapedFrom?: string;
    addedBy?: string;
    verifiedBy?: string[];
  } | null;
}

export interface VendorSearchFilters {
  category: string;
  location: string;
  priceRange: { min: string; max: string };
  rating: number;
  distance: number;
}

export interface CommunityVendorData {
  id?: string;
  name?: string;
  description?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  specialties?: string[];
  pricing?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  instagram?: {
    handle: string;
    url: string;
    confidence: 'high' | 'medium' | 'low';
    scrapedAt?: string;
    scrapedFrom?: string;
    addedBy?: string;
    verifiedBy?: string[];
  } | null;
}
