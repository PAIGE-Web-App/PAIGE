"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Star, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';

// Same categories as used in the catalog page
const CATEGORIES = [
  { value: 'florist', label: 'Florists', singular: 'Florist' },
  { value: 'jewelry_store', label: 'Jewelers', singular: 'Jeweler' },
  { value: 'bakery', label: 'Bakeries & Cakes', singular: 'Bakery' },
  { value: 'restaurant', label: 'Reception Venues', singular: 'Reception Venue' },
  { value: 'hair_care', label: 'Hair & Beauty', singular: 'Hair & Beauty' },
  { value: 'photographer', label: 'Photographers', singular: 'Photographer' },
  { value: 'videographer', label: 'Videographers', singular: 'Videographer' },
  { value: 'clothing_store', label: 'Bridal Salons', singular: 'Bridal Salon' },
  { value: 'beauty_salon', label: 'Beauty Salons', singular: 'Beauty Salon' },
  { value: 'spa', label: 'Spas', singular: 'Spa' },
  { value: 'dj', label: 'DJs', singular: 'DJ' },
  { value: 'band', label: 'Bands', singular: 'Band' },
  { value: 'wedding_planner', label: 'Wedding Planners', singular: 'Wedding Planner' },
  { value: 'caterer', label: 'Catering', singular: 'Caterer' },
  { value: 'car_rental', label: 'Car Rentals', singular: 'Car Rental' },
  { value: 'travel_agency', label: 'Travel Agencies', singular: 'Travel Agency' },
  { value: 'officiant', label: 'Officiants', singular: 'Officiant' },
  { value: 'suit_rental', label: 'Suit & Tux Rentals', singular: 'Suit & Tux Rental' },
  { value: 'makeup_artist', label: 'Makeup Artists', singular: 'Makeup Artist' },
  { value: 'stationery', label: 'Stationery & Invitations', singular: 'Stationery' },
  { value: 'rentals', label: 'Event Rentals', singular: 'Event Rental' },
  { value: 'favors', label: 'Wedding Favors', singular: 'Wedding Favor' },
];

interface RelatedVendor {
  id: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  image?: string;
  category: string;
}

interface RelatedVendorsSectionProps {
  currentVendorId: string;
  category: string;
  location: string;
}

export default function RelatedVendorsSection({ 
  currentVendorId, 
  category, 
  location 
}: RelatedVendorsSectionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccessToast } = useCustomToast();
  
  const [relatedVendors, setRelatedVendors] = useState<RelatedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Fetch related vendors
  useEffect(() => {
    const fetchRelatedVendors = async () => {
      if (!category || !location) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Convert display category to API category using the same mapping as catalog page
        const categoryObj = CATEGORIES.find(cat => 
          cat.label === category || cat.singular === category
        );
        const apiCategory = categoryObj ? categoryObj.value : category.toLowerCase().replace(/\s+/g, '_');
        
        console.log('RelatedVendorsSection: Fetching related vendors', {
          displayCategory: category,
          apiCategory,
          location,
          currentVendorId
        });
        
        const response = await fetch('/api/google-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: apiCategory,
            location,
            maxResults: 10 // Fetch more to filter out current vendor and get best 3
          })
        });

        const data = await response.json();
        
        if (data.results && Array.isArray(data.results)) {
          // Filter out current vendor and map to our format
          const filteredVendors = data.results
            .filter((vendor: any) => vendor.place_id !== currentVendorId)
            .map((vendor: any) => ({
              id: vendor.place_id,
              name: vendor.name,
              rating: vendor.rating,
              reviewCount: vendor.user_ratings_total,
              address: vendor.formatted_address,
              image: vendor.photos && vendor.photos.length > 0
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${vendor.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                : '/Venue.png',
              category: vendor.types?.[0] || 'Vendor'
            }))
            // Sort by popularity (rating * review count, with fallback to rating)
            .sort((a, b) => {
              const aScore = (a.rating || 0) * (a.reviewCount || 1);
              const bScore = (b.rating || 0) * (b.reviewCount || 1);
              return bScore - aScore;
            })
            .slice(0, 3); // Take top 3

          setRelatedVendors(filteredVendors);
        }
      } catch (error) {
        console.error('Error fetching related vendors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedVendors();
  }, [category, location, currentVendorId]);

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFavorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
      setFavorites(storedFavorites);
    }
  }, []);

  // Handle favorite toggle
  const toggleFavorite = (vendorId: string) => {
    const newFavorites = favorites.includes(vendorId)
      ? favorites.filter(id => id !== vendorId)
      : [...favorites, vendorId];
    
    setFavorites(newFavorites);
    localStorage.setItem('vendorFavorites', JSON.stringify(newFavorites));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
      detail: { favorites: newFavorites }
    }));
    
    if (newFavorites.includes(vendorId)) {
      showSuccessToast('Added to favorites!');
    }
  };

  // Handle vendor click
  const handleVendorClick = (vendor: RelatedVendor) => {
    router.push(`/vendors/${vendor.id}?category=${category}&location=${location}`);
  };

  // Don't render if no related vendors
  if (!loading && relatedVendors.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h5 className="mb-4">
        Related Vendors
      </h5>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
              <div className="h-32 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {relatedVendors.map((vendor) => (
            <div 
              key={vendor.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleVendorClick(vendor)}
            >
              {/* Vendor Image */}
              <div className="relative h-32 bg-[#F3F2F0] rounded-t-lg overflow-hidden">
                <img
                  src={vendor.image}
                  alt={vendor.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/Venue.png';
                  }}
                />
                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(vendor.id);
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${
                    favorites.includes(vendor.id)
                      ? 'bg-[#A85C36] text-white'
                      : 'bg-white/80 text-gray-600 hover:bg-white'
                  }`}
                >
                  <Heart className={`w-3 h-3 ${favorites.includes(vendor.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              {/* Vendor Info */}
              <div className="p-4">
                <h6 className="mb-2 line-clamp-2">
                  {vendor.name}
                </h6>
                
                {/* Rating */}
                {vendor.rating && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-xs text-[#364257]">
                      {vendor.rating} {vendor.reviewCount && `(${vendor.reviewCount})`}
                    </span>
                  </div>
                )}
                
                {/* Address */}
                {vendor.address && (
                  <div className="flex items-start gap-1 text-xs text-[#364257]">
                    <MapPin className="w-3 h-3 text-[#A85C36] mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{vendor.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 