import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import VendorEmailBadge from './VendorEmailBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Star, MapPin, Phone, Mail, Globe, Flag, MessageSquare } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { getVendorImageImmediate, isPlaceholderImage } from '@/utils/vendorImageUtils';

// Move utility functions outside component to prevent recreation
function getFavorites() {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
}

function setFavorites(favorites: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('vendorFavorites', JSON.stringify(favorites));
}

interface VendorCardRoverStyleProps {
  vendor: {
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
    image?: string; // Added for enhanced image loading
  };
  onContact?: () => void;
  onFlag?: () => void;
  onShowContactModal?: (vendor: any) => void;
  onShowFlagModal?: (vendor: any) => void;
  communityData?: any; // Added for community vendor data
}

export default function VendorCardRoverStyle({ 
  vendor, 
  onContact, 
  onFlag, 
  onShowContactModal, 
  onShowFlagModal,
  communityData 
}: VendorCardRoverStyleProps) {
  const { user } = useAuth();
  const { showSuccessToast } = useCustomToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [communityDataState, setCommunityDataState] = useState<any>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(getVendorImageImmediate(vendor));

  // Use communityData prop if provided, otherwise fall back to local state
  const effectiveCommunityData = communityData || communityDataState;

  const isPlaceholder = useMemo(() => isPlaceholderImage(imgSrc), [imgSrc]);

  // Enhanced image loading - memoized to prevent infinite re-renders
  const loadVendorImage = useCallback(async () => {
    setImageLoading(true);
    setImageError(false);
    
    try {
      // If vendor already has a Google Places image, use it
      if (vendor.image && vendor.image.includes('maps.googleapis.com')) {
        setImgSrc(vendor.image);
        setImageLoading(false);
        return;
      }

      // Try to fetch images from Google Places API
      if (vendor.place_id) {
        const response = await fetch(`/api/vendor-photos/${vendor.place_id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.images && data.images.length > 0) {
            setImgSrc(data.images[0]);
            setImageLoading(false);
            return;
          }
        }
      }

      // Fallback to immediate image or placeholder
      const fallbackImage = getVendorImageImmediate(vendor);
      setImgSrc(fallbackImage);
      setImageLoading(false);
    } catch (error) {
      console.error('Error loading vendor image:', error);
      setImageError(true);
      setImgSrc('/Venue.png');
      setImageLoading(false);
    }
  }, [vendor.place_id]); // Only depend on place_id to prevent infinite loops

  // Run image loading effect only when place_id changes
  useEffect(() => {
    // Only run if we have a valid vendor with place_id
    if (vendor?.place_id) {
      loadVendorImage();
    }
  }, [loadVendorImage, vendor?.place_id]);

  useEffect(() => {
    // Set initial favorite state from localStorage
    const favs = getFavorites();
    setIsFavorite(favs.includes(vendor.place_id));
    
    // Only fetch data if communityData prop is not provided
    if (!communityData) {
      // Batch API calls
      const fetchData = async () => {
        try {
          const [flagResponse, communityResponse] = await Promise.all([
            fetch('/api/flag-vendor'),
            fetch(`/api/community-vendors?placeId=${vendor.place_id}`)
          ]);

          const [flagData, communityData] = await Promise.all([
            flagResponse.json(),
            communityResponse.json()
          ]);

          if (flagData.flagged && flagData.flagged.some(f => f.vendorId === vendor.place_id)) {
            setIsFlagged(true);
          }

          if (communityData.vendor) {
            setCommunityDataState(communityData.vendor);
          }
        } catch (error) {
          console.error('Error fetching vendor data:', error);
        }
      };

      fetchData();
    } else {
      // Use the provided communityData
      setCommunityDataState(communityData);
    }
  }, [vendor.place_id, communityData]);

  const handleFavoriteToggle = async () => {
    if (!user?.uid) {
      showSuccessToast('Please log in to save favorites');
      return;
    }

    const favs = getFavorites();
    const newFavs = isFavorite 
      ? favs.filter(id => id !== vendor.place_id)
      : [...favs, vendor.place_id];
    
    setFavorites(newFavs);
    setIsFavorite(!isFavorite);
    
    showSuccessToast(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleImageError = () => {
    setImageError(true);
    setImgSrc('/Venue.png');
  };

  const getPriceLevel = (level?: number) => {
    if (!level) return '';
    return '$'.repeat(level);
  };

  const getMainCategory = () => {
    if (!vendor.types || vendor.types.length === 0) return 'Vendor';
    
    // Map Google Places types to friendly names
    const categoryMap: Record<string, string> = {
      'photographer': 'Photographer',
      'restaurant': 'Venue',
      'florist': 'Florist',
      'jewelry_store': 'Jeweler',
      'bakery': 'Bakery',
      'beauty_salon': 'Beauty Salon',
      'spa': 'Spa',
      'dj': 'DJ',
      'band': 'Band',
      'wedding_planner': 'Wedding Planner',
      'caterer': 'Caterer',
      'car_rental': 'Car Rental',
      'travel_agency': 'Travel Agency',
      'officiant': 'Officiant',
      'suit_rental': 'Suit Rental',
      'makeup_artist': 'Makeup Artist',
      'stationery': 'Stationery',
      'rentals': 'Event Rentals',
      'favors': 'Wedding Favors'
    };

    for (const type of vendor.types) {
      if (categoryMap[type]) {
        return categoryMap[type];
      }
    }
    
    return vendor.types[0]?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Vendor';
  };

  return (
    <div className="bg-white border border-[#AB9C95] rounded-[5px] p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Left: Image */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 bg-[#F3F2F0] rounded-[5px] overflow-hidden flex items-center justify-center">
            {imageLoading ? (
              <div className="w-12 h-12 bg-[#AB9C95] rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  L
                </span>
              </div>
            ) : imageError || isPlaceholder ? (
              <div className="w-12 h-12 bg-[#AB9C95] rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {imageError ? 'E' : vendor.name.charAt(0).toUpperCase()}
                </span>
              </div>
            ) : (
              <img
                src={imgSrc}
                alt={vendor.name}
                className="w-full h-full object-cover"
                onError={handleImageError}
                onLoad={() => setImageLoading(false)}
              />
            )}
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#332B42] text-lg truncate">
                {vendor.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-[#AB9C95] mt-1">
                <MapPin size={14} />
                <span className="truncate">{vendor.vicinity || vendor.formatted_address}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={handleFavoriteToggle}
                className={`p-2 rounded-full transition-colors ${
                  isFavorite 
                    ? 'text-[#A85C36] bg-[#F3F2F0]' 
                    : 'text-[#AB9C95] hover:text-[#A85C36] hover:bg-[#F3F2F0]'
                }`}
              >
                <Heart size={16} className={isFavorite ? 'fill-current' : ''} />
              </button>
              <button
                onClick={onFlag}
                className="p-2 rounded-full text-[#AB9C95] hover:text-[#A85C36] hover:bg-[#F3F2F0] transition-colors"
              >
                <Flag size={16} />
              </button>
            </div>
          </div>

          {/* Category and Price */}
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2 py-1 bg-[#F3F2F0] text-[#332B42] text-xs font-medium rounded">
              {getMainCategory()}
            </span>
            {vendor.price_level && (
              <span className="text-[#AB9C95] text-sm">
                {getPriceLevel(vendor.price_level)}
              </span>
            )}
          </div>

          {/* Rating and Reviews */}
          {vendor.rating && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400 fill-current" />
                <span className="text-sm font-medium text-[#332B42]">
                  {vendor.rating}
                </span>
              </div>
              {vendor.user_ratings_total && (
                <span className="text-sm text-[#AB9C95]">
                  ({vendor.user_ratings_total} reviews)
                </span>
              )}
            </div>
          )}

          {/* Contact Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onContact}
              className="flex items-center gap-2 px-3 py-2 bg-[#A85C36] text-white text-sm font-medium rounded-[5px] hover:bg-[#784528] transition-colors"
            >
              <MessageSquare size={14} />
              Contact
            </button>
            
            {vendor.formatted_phone_number && (
              <a
                href={`tel:${vendor.formatted_phone_number}`}
                className="flex items-center gap-1 px-3 py-2 text-[#A85C36] border border-[#A85C36] text-sm font-medium rounded-[5px] hover:bg-[#A85C36] hover:text-white transition-colors"
              >
                <Phone size={14} />
                Call
              </a>
            )}
            
            {vendor.website && (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 text-[#A85C36] border border-[#A85C36] text-sm font-medium rounded-[5px] hover:bg-[#A85C36] hover:text-white transition-colors"
              >
                <Globe size={14} />
                Website
              </a>
            )}
          </div>

          {/* Community Badge */}
          {effectiveCommunityData && (
            <div className="mt-3">
              <VendorEmailBadge placeId={vendor.place_id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
