import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import VendorEmailBadge from './VendorEmailBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Star, MapPin, Phone, Mail, Globe, Flag, MessageSquare } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { getVendorImageImmediate, isPlaceholderImage } from '@/utils/vendorImageUtils';
import { useFavorites } from '@/hooks/useFavorites';



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
  isHighlighted?: boolean; // Added for highlighting when map marker is hovered/clicked
}

export default function VendorCardRoverStyle({ 
  vendor, 
  onContact, 
  onFlag, 
  onShowContactModal, 
  onShowFlagModal,
  communityData,
  isHighlighted = false
}: VendorCardRoverStyleProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccessToast } = useCustomToast();
  const [isFlagged, setIsFlagged] = useState(false);
  const [communityDataState, setCommunityDataState] = useState<any>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(getVendorImageImmediate(vendor));
  
  // Use the proper useFavorites hook for persistent favorites
  const { isFavorite, toggleFavorite } = useFavorites();



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

    try {
      console.log('📤 Sending vendor data for favorite:', {
        place_id: vendor.place_id,
        name: vendor.name,
        address: vendor.vicinity || vendor.formatted_address,
        category: 'Vendor'
      });
      
      await toggleFavorite(vendor.place_id, {
        name: vendor.name,
        address: vendor.vicinity || vendor.formatted_address,
        category: 'Vendor'
      });
      
      // Refresh community data to get updated counts
      try {
        const communityResponse = await fetch(`/api/community-vendors?placeId=${vendor.place_id}`);
        if (communityResponse.ok) {
          const data = await communityResponse.json();
          if (data.vendor) {
            setCommunityDataState(data.vendor);
          }
        }
      } catch (error) {
        console.error('Error refreshing community data:', error);
      }
      
      // Don't show additional toast - the hook handles this
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showSuccessToast('Failed to update favorites');
    }
  };

  const handleImageError = () => {
    setImageError(true);
    setImgSrc('/Venue.png');
  };

  const handleViewDetailsClick = () => {
    // Navigate to vendor details page
    router.push(`/vendors/${vendor.place_id}`);
  };

  const getPriceLevel = (level?: number) => {
    if (!level) return '';
    return '$'.repeat(level);
  };



  return (
    <div className={`group bg-white p-4 transition-all duration-200 min-h-[140px] flex flex-col ${isHighlighted ? 'bg-[#F8F7F5] ring-1 ring-[#A85C36] ring-opacity-30' : ''}`}>
      <div className="flex gap-4 flex-1">
        {/* Left: Image */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 bg-[#F3F2F0] overflow-hidden rounded-lg flex items-center justify-center">
            {imageLoading && vendor.name ? (
              <div className="w-12 h-12 bg-[#AB9C95] rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {vendor.name.charAt(0).toUpperCase()}
                </span>
              </div>
            ) : !vendor.name ? (
              // Skeleton state - show gray placeholder
              <div className="w-full h-full bg-[#E0D6D0] rounded-lg" />
            ) : imageError || isPlaceholder ? (
              <img
                src="/Venue.png"
                alt={vendor.name}
                className="w-full h-full object-contain"
              />
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
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h6 className="h6 truncate">
                {vendor.name}
              </h6>
              <div className="flex items-center gap-1 text-xs text-[#332B42] mt-1">
                <MapPin size={12} />
                <span className="truncate">{vendor.vicinity || vendor.formatted_address}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={handleFavoriteToggle}
                className={`p-2 rounded-full transition-colors ${
                  isFavorite(vendor.place_id)
                    ? 'text-[#A85C36] bg-[#F3F2F0]' 
                    : 'text-[#AB9C95] hover:text-[#A85C36] hover:bg-[#F3F2F0]'
                }`}
              >
                <Heart size={16} className={isFavorite(vendor.place_id) ? 'fill-current' : ''} />
              </button>
              <button
                onClick={() => onShowFlagModal?.(vendor)}
                className={`p-2 rounded-full transition-colors ${
                  isFlagged 
                    ? 'text-red-600 bg-red-100' 
                    : 'text-[#AB9C95] hover:text-[#A85C36] hover:bg-[#F3F2F0]'
                }`}
                disabled={isFlagged}
              >
                <Flag size={16} />
              </button>
            </div>
          </div>

          {/* Price Level */}
          {vendor.price_level && (
            <div className="mb-1">
              <span className="text-xs text-[#332B42]">
                {getPriceLevel(vendor.price_level)}
              </span>
            </div>
          )}

          {/* Rating and Reviews */}
          {vendor.rating && (
            <div className="flex items-center gap-1 mb-1">
              <div className="flex items-center gap-1">
                <Star size={12} className="text-yellow-500 fill-current" />
                <span className="text-xs text-[#A85C36]">
                  {vendor.rating}
                </span>
              </div>
              {vendor.user_ratings_total && (
                <span className="text-xs text-[#332B42]">
                  ({vendor.user_ratings_total} reviews)
                </span>
              )}
            </div>
          )}

          {/* Smart Favorites Badge */}
          {(isFavorite(vendor.place_id) || (communityDataState && communityDataState.totalFavorites > 0)) && (
            <div className="flex items-center gap-1 text-xs text-[#364257] mb-3">
              <Heart className="w-3 h-3 text-pink-500 fill-current" />
              <span>
                {(() => {
                  if (isFavorite(vendor.place_id) && communityDataState && communityDataState.totalFavorites > 1) {
                    // You + others have favorited it
                    const othersCount = communityDataState.totalFavorites - 1;
                    if (othersCount === 1) {
                      return 'Favorited by you and 1 other';
                    } else {
                      return `Favorited by you and ${othersCount} others`;
                    }
                  } else if (isFavorite(vendor.place_id)) {
                    // Only you have favorited it
                    return 'Favorited by you';
                  } else if (communityDataState && communityDataState.totalFavorites > 0) {
                    // Others have favorited it but you haven't
                    if (communityDataState.totalFavorites === 1) {
                      return 'Favorited by 1 user';
                    } else {
                      return `Favorited by ${communityDataState.totalFavorites} users`;
                    }
                  }
                  return '';
                })()}
              </span>
            </div>
          )}

          {/* Community Badge */}
          {effectiveCommunityData && (
            <div className="mt-3 mb-3">
              <VendorEmailBadge placeId={vendor.place_id} />
            </div>
          )}

          {/* Contact Actions - Hidden by default, shown on hover */}
          <div className="flex gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={onContact}
              className="btn-primaryinverse flex items-center gap-2"
            >
              <MessageSquare size={14} />
              Contact
            </button>
            
            <button
              onClick={handleViewDetailsClick}
              className="btn-primary flex items-center gap-2"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
