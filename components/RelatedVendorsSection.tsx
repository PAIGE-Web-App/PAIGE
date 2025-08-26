"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Heart, MapPin, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useFavorites } from '@/hooks/useFavorites';
import { enhanceVendorsWithImages } from '@/utils/vendorImageUtils';
import VendorContactModal from '@/components/VendorContactModal';
import { mapGoogleTypesToCategory } from '@/utils/vendorUtils';

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
  images?: string[];
  category: string;
  placeId?: string;
  hasRealImages?: boolean;
  types?: string[];
  mainTypeLabel?: string;
}

interface RelatedVendorsSectionProps {
  currentVendorId: string;
  category: string;
  location: string;
  onShowFlagModal?: (vendor: any) => void;
  onShowContactModal?: (vendor: any) => void;
}

export default function RelatedVendorsSection({ 
  currentVendorId, 
  category, 
  location,
  onShowFlagModal,
  onShowContactModal
}: RelatedVendorsSectionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccessToast } = useCustomToast();
  
  const [relatedVendors, setRelatedVendors] = useState<RelatedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  // Use the proper useFavorites hook for persistent favorites
  const { isFavorite, toggleFavorite } = useFavorites();


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
              placeId: vendor.place_id,
              name: vendor.name,
              rating: vendor.rating,
              reviewCount: vendor.user_ratings_total,
              address: vendor.formatted_address,
              image: vendor.photos && vendor.photos.length > 0
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${vendor.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                : '/Venue.png',
              images: vendor.photos ? vendor.photos.map((photo: any) => 
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
              ) : ['/Venue.png'],
              category: mapGoogleTypesToCategory(vendor.types || [], vendor.name),
              mainTypeLabel: mapGoogleTypesToCategory(vendor.types || [], vendor.name),
              types: vendor.types || []
            }))
            // Sort by popularity (rating * review count, with fallback to rating)
            .sort((a, b) => {
              const aScore = (a.rating || 0) * (a.reviewCount || 1);
              const bScore = (b.rating || 0) * (b.reviewCount || 1);
              return bScore - aScore;
            })
            .slice(0, 3); // Take top 3

          // Enhance vendors with proper image handling
          try {
            const enhancedVendors = await enhanceVendorsWithImages(filteredVendors);

            setRelatedVendors(enhancedVendors);
          } catch (error) {
            console.error('Error enhancing related vendors with images:', error);
            setRelatedVendors(filteredVendors);
          }
        }
      } catch (error) {
        console.error('Error fetching related vendors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedVendors();
  }, [category, location, currentVendorId]);

  // Handle favorite toggle with proper vendor data
  const handleToggleFavorite = async (vendorId: string) => {
    try {
      await toggleFavorite(vendorId, {
        name: relatedVendors.find(v => v.id === vendorId)?.name || 'Vendor',
        address: relatedVendors.find(v => v.id === vendorId)?.address || '',
        category: relatedVendors.find(v => v.id === vendorId)?.category || ''
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Handle vendor click
  const handleVendorClick = (vendor: RelatedVendor) => {
    router.push(`/vendors/${vendor.id}?category=${category}&location=${location}`);
  };

  // Handle contact modal
  const handleShowContactModal = (vendor: any) => {
    onShowContactModal?.(vendor);
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
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse border border-gray-100">
              <div className="h-40 bg-gray-200 rounded-xl mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {relatedVendors.map((vendor) => (
            <div 
              key={vendor.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden group"
              onClick={() => handleVendorClick(vendor)}
            >
              {/* Vendor Image - Unique rounded design */}
              <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                <img
                  src={vendor.image}
                  alt={vendor.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/Venue.png';
                  }}
                />
                
                {/* Gradient overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                
                {/* Favorite Button - Unique floating design */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(vendor.id);
                  }}
                  className={`absolute top-3 right-3 p-2 rounded-full shadow-lg transition-all duration-300 ${
                    isFavorite(vendor.id)
                      ? 'bg-[#A85C36] text-white scale-110'
                      : 'bg-white/90 text-gray-600 hover:bg-white hover:scale-110'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite(vendor.id) ? 'fill-current' : ''}`} />
                </button>
                
                {/* Flag Button - Unique floating design */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowFlagModal?.(vendor);
                  }}
                  className="absolute top-3 left-3 z-10 bg-white/80 rounded-full p-1 shadow hover:bg-red-100 text-xs text-red-600 border border-red-200"
                  title="Flag vendor"
                  style={{ border: 'none' }}
                >
                  🚩 Flag
                </button>
                

              </div>
              
              {/* Vendor Info - Unique layout */}
              <div className="p-5">
                {/* Vendor Name - Larger, more prominent */}
                <h6 className="h6 mb-1 line-clamp-3">
                  {vendor.name}
                </h6>
                
                {/* Rating - Enhanced design */}
                {vendor.rating && (
                  <div className="flex items-center gap-1 text-xs mb-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-[#A85C36]">{vendor.rating}</span>
                    {vendor.reviewCount && (
                      <span className="text-[#332B42]">({vendor.reviewCount})</span>
                    )}
                  </div>
                )}
                
                {/* Address - With icon and better formatting */}
                {vendor.address && (
                  <div className="flex items-start gap-1 text-xs text-[#332B42] mb-1">
                    <span className="line-clamp-2">{vendor.address}</span>
                  </div>
                )}
                
                {/* Category */}
                {vendor.mainTypeLabel && (
                  <div className="text-xs text-[#AB9C95] mb-1">
                    {vendor.mainTypeLabel}
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