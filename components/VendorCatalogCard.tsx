import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import VendorEmailBadge from './VendorEmailBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Star } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useFavoritesSimple } from '@/hooks/useFavoritesSimple';
import { getVendorImageImmediate, isPlaceholderImage } from '@/utils/vendorImageUtils';
import ProgressiveImage from './ProgressiveImage';
import SelectedVendorPill from './SelectedVendorPill';
import { highlightText } from '@/utils/searchHighlight';

// Removed custom heart icons - now using Lucide React Heart component for consistency


interface VendorCatalogCardProps {
  vendor: {
    id: string;
    placeId?: string;
    place_id?: string;
    name: string;
    image: string;
    rating?: number;
    reviewCount?: number;
    price?: string;
    address?: string;
    location?: string;
    mainTypeLabel?: string | null;
    source?: { name: string; url: string } | null;
    estimate?: string;
    phone?: string;
    email?: string;
  };
  onContact?: () => void;
  onFlagged?: (vendorId: string) => void;
  bulkContactMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (vendorId: string) => void;
  location?: string;
  category?: string;
  isFavoriteOverride?: boolean;
  onShowContactModal?: (vendor: any) => void;
  onShowFlagModal?: (vendor: any) => void;
  onMobileSelect?: () => void;
  isSelectedVenue?: boolean;
  isSelectedVendor?: boolean;
  selectedCategory?: string;
  onUpdateSelectedVendor?: (vendor: any) => void;
  searchTerm?: string;
}

const VendorCatalogCard = React.memo(({ vendor, onContact, onFlagged, bulkContactMode = false, isSelected = false, onSelectionChange, location = '', category = '', isFavoriteOverride = false, onShowContactModal, onShowFlagModal, onMobileSelect, isSelectedVenue = false, isSelectedVendor = false, selectedCategory = '', onUpdateSelectedVendor, searchTerm = '' }: VendorCatalogCardProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccessToast } = useCustomToast();
  const [imgSrc, setImgSrc] = useState(getVendorImageImmediate(vendor));
  const [isFlagged, setIsFlagged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ref for email badge to trigger email fetch
  const emailBadgeRef = useRef<{ fetchEmails: () => Promise<void> }>(null);

  // Use the simplified favorites hook
  const { isFavorite, toggleFavorite } = useFavoritesSimple();
  
  // Handle favorite toggle with proper vendor data
  const handleToggleFavorite = useCallback(async () => {
    try {
      await toggleFavorite({
        placeId: vendor.placeId || vendor.id,
        name: vendor.name,
        address: vendor.address || vendor.location,
        category: vendor.mainTypeLabel || 'Vendor',
        rating: vendor.rating,
        reviewCount: vendor.reviewCount,
        image: vendor.image
      });
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [toggleFavorite, vendor.placeId, vendor.id, vendor.name, vendor.address, vendor.location, vendor.mainTypeLabel, vendor.rating, vendor.reviewCount, vendor.image]);

  const isPlaceholder = useMemo(() => isPlaceholderImage(imgSrc), [imgSrc]);

  // Memoized vendor data
  const vendorData = useMemo(() => ({
    id: vendor.id,
    name: vendor.name,
    address: vendor.address || vendor.location,
    category: vendor.mainTypeLabel || 'Vendor'
  }), [vendor.id, vendor.name, vendor.address, vendor.location, vendor.mainTypeLabel]);

  useEffect(() => {
    // Fetch flag data only
    const fetchData = async () => {
      try {
        const flagResponse = await fetch('/api/flag-vendor');
        const flagData = await flagResponse.json();

        if (flagData.flagged && flagData.flagged.some(f => f.vendorId === vendor.id)) {
          setIsFlagged(true);
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      }
    };

    fetchData();
  }, [vendor.id]);





  const handleFlagVendor = useCallback(async (reason, customReason) => {
    setIsSubmitting(true);
    try {
      await fetch('/api/flag-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vendorId: vendor.id,
          reason,
          customReason
        }),
      });
      setIsFlagged(true);
      if (onFlagged) {
        onFlagged(vendor.id);
      }
    } catch (error) {
      console.error('Error flagging vendor:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [vendor.id, onFlagged]);

  const handleCardClick = useCallback((e) => {
    // Don't trigger if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) {
      return;
    }
    
    // In bulk mode, toggle selection
    if (bulkContactMode) {
      if (onSelectionChange) {
        onSelectionChange(vendor.id);
      }
      return;
    }
    
    // Check if we're on mobile and should use mobile selection
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onMobileSelect) {
      onMobileSelect();
      return;
    }
    
    // In normal mode, navigate to vendor detail page
    // Use place_id (or placeId) for the route, not id
    const vendorId = vendor.place_id || vendor.placeId || vendor.id;
    const baseUrl = location ? `/vendors/${vendorId}?location=${encodeURIComponent(location)}&category=${encodeURIComponent(category)}` : `/vendors/${vendorId}?category=${encodeURIComponent(category)}`;
    router.push(baseUrl);
  }, [bulkContactMode, onSelectionChange, vendor.place_id, vendor.placeId, vendor.id, location, router, category, onMobileSelect]);

  const handleImageError = useCallback(() => {
    console.warn('VendorCatalogCard image error for vendor:', vendor.name, 'current src:', imgSrc);
    setImgSrc('/Venue.png');
  }, [vendor.name, imgSrc]);

  const handleContactClick = useCallback(async () => {
    // Fetch vendor emails before showing contact modal
    if (emailBadgeRef.current) {
      try {
        await emailBadgeRef.current.fetchEmails();
      } catch (error) {
        console.error('Failed to fetch vendor emails:', error);
      }
    }
    
    if (onShowContactModal) {
      onShowContactModal(vendor);
    }
  }, [onShowContactModal, vendor]);

  const handleViewDetailsClick = useCallback(() => {
    // Use place_id (or placeId) for the route, not id
    const vendorId = vendor.place_id || vendor.placeId || vendor.id;
    const baseUrl = location ? `/vendors/${vendorId}?location=${encodeURIComponent(location)}&category=${encodeURIComponent(category)}` : `/vendors/${vendorId}?category=${encodeURIComponent(category)}`;
    router.push(baseUrl);
  }, [vendor.place_id, vendor.placeId, vendor.id, location, router, category]);

  const handleSelectionChange = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange(vendor.id);
    }
  }, [onSelectionChange, vendor.id]);

  return (
    <div 
      className={`group bg-white border rounded-[5px] flex flex-col items-start relative h-full min-h-[320px] cursor-pointer hover:shadow-lg hover:shadow-gray-300/50 transition-all duration-200 hover:-translate-y-1${isFlagged ? ' border-red-500' : ''}${isSelected ? ' border-[#A85C36] border-2' : ''}`}
      onClick={handleCardClick}
    >
      {/* Bulk selection checkbox */}
      {bulkContactMode && (
        <div className="absolute z-20 top-3 left-3 bg-white rounded shadow-sm p-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectionChange}
            className="w-5 h-5 text-[#A85C36] bg-white border-2 border-[#A85C36] rounded focus:ring-[#A85C36] focus:ring-2 cursor-pointer"
          />
        </div>
      )}
      
      {/* Heart icon - hidden in bulk mode */}
      {!bulkContactMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite();
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors z-20 shadow-md ${
            (isFavorite(vendor.placeId || vendor.id) || isFavoriteOverride)
              ? 'bg-white/90 text-pink-500 hover:text-pink-600'
              : 'bg-white/80 text-gray-600 hover:bg-white'
          }`}
          aria-label={isFavorite(vendor.placeId || vendor.id) ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-3 h-3 ${(isFavorite(vendor.placeId || vendor.id) || isFavoriteOverride) ? 'fill-current text-pink-500' : ''}`} />
        </button>
      )}
      
      {/* Flag button */}
      {!bulkContactMode && !isFlagged && (
        <button
          className="absolute top-3 left-3 z-10 bg-white/80 rounded-full p-1 shadow hover:bg-red-100 text-xs text-red-600 border border-red-200"
          onClick={(e) => {
            e.stopPropagation();
            onShowFlagModal?.(vendor);
          }}
          aria-label="Flag vendor"
          style={{ border: 'none' }}
        >
          🚩 Flag
        </button>
      )}
      {!bulkContactMode && isFlagged && (
        <span className="absolute top-3 left-3 z-10 bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold border border-red-200">Flagged</span>
      )}
      
      <div className="w-full min-h-[128px] h-32 bg-[#F3F2F0] rounded-t-[5px] flex items-center justify-center overflow-hidden">
        <ProgressiveImage
          src={imgSrc}
          alt={vendor.name}
          placeholder="/Venue.png"
          className={`w-full h-full ${isPlaceholder ? 'object-contain' : 'object-cover'}`}
          onError={handleImageError}
          priority={false}
          threshold={0.1}
        />
      </div>
      
      <div className="flex-1 w-full flex flex-col justify-between p-4">
        <div>
          <h6 className="h6 mb-1">
            {searchTerm ? highlightText(vendor.name, searchTerm) : vendor.name}
          </h6>
          
          {/* Selected Vendor Pills */}
          {isSelectedVenue && (
            <div onClick={(e) => e.stopPropagation()}>
              <SelectedVendorPill 
                category="main-venue" 
                isSelectedVenue={true} 
                isMainSelectedVenue={true}
                clickable={!!onUpdateSelectedVendor}
                onClick={() => onUpdateSelectedVendor?.(vendor)}
              />
            </div>
          )}
          
          {isSelectedVendor && !isSelectedVenue && selectedCategory && (
            <div onClick={(e) => e.stopPropagation()}>
              <SelectedVendorPill 
                category={selectedCategory} 
                isSelectedVenue={false} 
                clickable={!!onUpdateSelectedVendor}
                onClick={() => onUpdateSelectedVendor?.(vendor)}
              />
            </div>
          )}
          
          <div className="flex items-center gap-1 text-xs mb-1">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-[#A85C36]">{vendor.rating}</span>
            <span className="text-[#332B42]">({vendor.reviewCount})</span>
          </div>
          {vendor.price && (
            <div className="text-xs text-[#332B42] mb-1">{vendor.price}</div>
          )}
                     <div className="flex items-start gap-1 text-xs text-[#332B42] mb-1">
             <span>{vendor.address || vendor.location}</span>
           </div>
           {vendor.mainTypeLabel && (
             <div className="flex items-center gap-1 text-xs text-[#AB9C95] mb-1">
               <span>{vendor.mainTypeLabel}</span>
             </div>
           )}
          {vendor.source && vendor.source.url && (
            <a href={vendor.source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#A85C36] underline mb-2 block">{vendor.source.name}</a>
          )}
          
          {/* Personal Favorites Badge */}
          {isFavorite(vendor.placeId || vendor.id) && (
            <div className="flex items-center gap-1 text-xs text-[#364257] mb-1">
              <Heart className="w-3 h-3 text-pink-500 fill-current" />
              <span>Favorited by you</span>
            </div>
          )}
          
          {/* Vendor Email Badge - Only show if emails are available */}
          <VendorEmailBadge 
            ref={emailBadgeRef}
            placeId={vendor.id} 
            className="mb-2" 
            autoFetch={false}
          />
          
          {/* Price estimate badge */}
          {vendor.estimate && (
            <div className="mt-2 mb-1 px-3 py-1 bg-[#E6EEF6] text-[#364257] text-base font-semibold rounded shadow-sm">
              Estimate {vendor.estimate}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 w-full mt-auto p-4 pt-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
        <button 
          className="btn-primaryinverse flex-1" 
          onClick={(e) => {
            e.stopPropagation();
            handleContactClick();
          }}
          disabled={bulkContactMode}
        >
          Contact
        </button>
        <button 
          className="btn-primary flex-1" 
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetailsClick();
          }}
          disabled={bulkContactMode}
        >
          View Details
        </button>
      </div>
    </div>
  );
});

VendorCatalogCard.displayName = 'VendorCatalogCard';

export default VendorCatalogCard; 