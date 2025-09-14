import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import VendorEmailBadge from './VendorEmailBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Star, MapPin, Phone, Mail, Globe, Flag, MessageSquare } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';

import { useFavoritesSimple } from '@/hooks/useFavoritesSimple';



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
  isHighlighted?: boolean; // Added for highlighting when map marker is hovered/clicked
}

const VendorCardRoverStyle = React.memo(({ 
  vendor, 
  onContact, 
  onFlag, 
  onShowContactModal, 
  onShowFlagModal,
  isHighlighted = false
}: VendorCardRoverStyleProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [isFlagged, setIsFlagged] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');
  
  // Ref for email badge to trigger email fetch
  const emailBadgeRef = useRef<{ fetchEmails: () => Promise<void> }>(null);
  
  // Use the simplified favorites hook
  const { isFavorite, toggleFavorite } = useFavoritesSimple();






  // Simplified image loading - only load if not already loaded
  useEffect(() => {
    if (!imgSrc || imgSrc === '/Venue.png') {
      // If vendor already has a Google Places image, use it
      if (vendor.image && vendor.image.includes('maps.googleapis.com')) {
        setImgSrc(vendor.image);
        setImageLoading(false);
        return;
      }

      // Try to fetch images from Google Places API
      if (vendor.place_id) {
        fetch(`/api/vendor-photos/${vendor.place_id}`)
          .then(response => response.json())
          .then(data => {
            if (data.images && data.images.length > 0) {
              setImgSrc(data.images[0]);
              setImageLoading(false);
            } else {
              setImgSrc('/Venue.png');
              setImageLoading(false);
            }
          })
          .catch(() => {
            setImgSrc('/Venue.png');
            setImageLoading(false);
          });
      } else {
        setImgSrc('/Venue.png');
        setImageLoading(false);
      }
    } else {
      setImageLoading(false);
    }
  }, [vendor.place_id, vendor.image, imgSrc]);

  useEffect(() => {
    // Fetch flag data only
    const fetchData = async () => {
      try {
        const flagResponse = await fetch('/api/flag-vendor');
        const flagData = await flagResponse.json();

        if (flagData.flagged && flagData.flagged.some(f => f.vendorId === vendor.place_id)) {
          setIsFlagged(true);
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      }
    };

    fetchData();
  }, [vendor.place_id]);

  // Listen for vendor flagged/unflagged events to update UI immediately
  useEffect(() => {
    const handleVendorFlagged = (event: CustomEvent) => {
      if (event.detail.vendorId === vendor.place_id) {
        setIsFlagged(true);
      }
    };

    const handleVendorUnflagged = (event: CustomEvent) => {
      if (event.detail.vendorId === vendor.place_id) {
        setIsFlagged(false);
      }
    };

    window.addEventListener('vendorFlagged', handleVendorFlagged as EventListener);
    window.addEventListener('vendorUnflagged', handleVendorUnflagged as EventListener);
    
    return () => {
      window.removeEventListener('vendorFlagged', handleVendorFlagged as EventListener);
      window.removeEventListener('vendorUnflagged', handleVendorUnflagged as EventListener);
    };
  }, [vendor.place_id]);

  const handleFavoriteToggle = useCallback(async () => {
    if (!user?.uid) {
      showSuccessToast('Please log in to save favorites');
      return;
    }

    try {
      await toggleFavorite({
        placeId: vendor.place_id,
        name: vendor.name,
        address: vendor.vicinity || vendor.formatted_address,
        category: 'Vendor',
        rating: vendor.rating,
        reviewCount: vendor.user_ratings_total,
        image: vendor.image
      });
      
      
      // Don't show additional toast - the hook handles this
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showSuccessToast('Failed to update favorites');
    }
  }, [user?.uid, toggleFavorite, vendor.place_id, vendor.name, vendor.vicinity, vendor.formatted_address, showSuccessToast]);

  const handleUnflagVendor = useCallback(async () => {
    try {
      const response = await fetch('/api/flag-vendor', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: vendor.place_id
        }),
      });

      if (response.ok) {
        setIsFlagged(false);
        showSuccessToast('Vendor unflagged successfully');
        
        // Dispatch unflag event for other components
        window.dispatchEvent(new CustomEvent('vendorUnflagged', { 
          detail: { vendorId: vendor.place_id } 
        }));
      } else {
        showErrorToast('Failed to unflag vendor');
      }
    } catch (error) {
      console.error('Error unflagging vendor:', error);
      showErrorToast('Failed to unflag vendor');
    }
  }, [vendor.place_id, showSuccessToast, showErrorToast]);

  const handleViewDetailsClick = useCallback(() => {
    // Open vendor details page in a new tab
    window.open(`/vendors/${vendor.place_id}`, '_blank');
  }, [vendor.place_id]);

  const getPriceLevel = useCallback((level?: number) => {
    if (!level) return '';
    return '$'.repeat(level);
  }, []);

  // Memoize computed values
  const priceLevelDisplay = useMemo(() => getPriceLevel(vendor.price_level), [getPriceLevel, vendor.price_level]);

  return (
    <div 
      className={`group p-4 transition-all duration-200 min-h-[140px] flex flex-col ${isHighlighted ? 'bg-[#F8F7F5] ring-1 ring-[#A85C36] ring-opacity-30' : 'bg-white'}`}
    >
      {/* Clickable area for the entire card */}
      <div 
        className="flex gap-4 flex-1 cursor-pointer"
        onClick={() => window.open(`/vendors/${vendor.place_id}`, '_blank')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.open(`/vendors/${vendor.place_id}`, '_blank');
          }
        }}
      >
        {/* Left: Image */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 bg-[#F3F2F0] overflow-hidden rounded-lg flex items-center justify-center">
            {imageLoading ? (
              // Simple loading state - just show gray placeholder
              <div className="w-full h-full bg-[#E0D6D0] rounded-lg" />
            ) : (
              <img
                src={imgSrc || '/Venue.png'}
                alt={vendor.name}
                className="w-full h-full object-cover"
                onError={() => {
                  setImageError(true);
                  setImgSrc('/Venue.png');
                }}
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
              <h6 className="h6 max-w-full">
                {vendor.name && vendor.name.length > 40 
                  ? `${vendor.name.substring(0, 40)}...` 
                  : vendor.name}
              </h6>
              <div className="flex items-center gap-1 text-xs text-[#332B42] mt-1">
                <MapPin size={12} />
                <span className="truncate max-w-full">{vendor.vicinity || vendor.formatted_address}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFavoriteToggle();
                }}
                className={`p-2 rounded-full transition-colors ${
                  isFavorite(vendor.place_id)
                    ? 'text-pink-500 hover:text-pink-600' 
                    : 'text-[#AB9C95] hover:text-pink-500'
                }`}
              >
                <Heart size={16} className={isFavorite(vendor.place_id) ? 'fill-current text-pink-500' : ''} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFlagged) {
                    handleUnflagVendor();
                  } else {
                    onShowFlagModal?.(vendor);
                  }
                }}
                className={`p-2 rounded-full transition-colors ${
                  isFlagged 
                    ? 'text-red-600 bg-red-100 hover:text-red-700 hover:bg-red-200' 
                    : 'text-[#AB9C95] hover:text-[#A85C36] hover:bg-[#F3F2F0]'
                }`}
                title={isFlagged ? 'Click to unflag vendor' : 'Click to flag vendor'}
              >
                <Flag size={16} />
              </button>
            </div>
          </div>

          {/* Price Level */}
          {vendor.price_level && (
            <div className="mb-1">
              <span className="text-xs text-[#332B42]">
                {priceLevelDisplay}
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

          {/* Personal Favorites Badge */}
          {isFavorite(vendor.place_id) && (
            <div className="flex items-center gap-1 text-xs text-[#364257] mb-2">
              <Heart className="w-3 h-3 text-pink-500 fill-current" />
              <span>Favorited by you</span>
            </div>
          )}

          {/* Flagged Vendor Badge */}
          {isFlagged && (
            <div className="flex items-center gap-1 text-xs text-red-600 mb-2">
              <Flag size={12} className="text-red-600" />
              <span>Flagged by you • Click flag to unflag</span>
            </div>
          )}

          {/* Vendor Email Badge - Only fetch when needed */}
          <div className="mt-2 mb-2">
            <VendorEmailBadge 
              ref={emailBadgeRef}
              placeId={vendor.place_id} 
              autoFetch={false}
            />
          </div>

          {/* Contact Actions - Hidden by default, shown on hover */}
          <div className="flex gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                
                // Fetch vendor emails before showing contact modal
                if (emailBadgeRef.current) {
                  try {
                    await emailBadgeRef.current.fetchEmails();
                  } catch (error) {
                    console.error('Failed to fetch vendor emails:', error);
                  }
                }
                
                onContact?.();
              }}
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
});

export default VendorCardRoverStyle;
