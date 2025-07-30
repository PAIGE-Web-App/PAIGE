import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import VendorEmailBadge from './VendorEmailBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Heart } from 'lucide-react';
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

// Removed custom heart icons - now using Lucide React Heart component for consistency

interface VendorCatalogCardProps {
  vendor: {
    id: string;
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
}

const VendorCatalogCard = React.memo(({ vendor, onContact, onFlagged, bulkContactMode = false, isSelected = false, onSelectionChange, location = '', category = '', isFavoriteOverride = false, onShowContactModal, onShowFlagModal }: VendorCatalogCardProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccessToast } = useCustomToast();
  const [imgSrc, setImgSrc] = useState(getVendorImageImmediate(vendor));
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [communityData, setCommunityData] = useState<any>(null);

  const isPlaceholder = useMemo(() => isPlaceholderImage(imgSrc), [imgSrc]);

  // Memoized vendor data
  const vendorData = useMemo(() => ({
    id: vendor.id,
    name: vendor.name,
    address: vendor.address || vendor.location,
    category: vendor.mainTypeLabel || 'Vendor'
  }), [vendor.id, vendor.name, vendor.address, vendor.location, vendor.mainTypeLabel]);

  useEffect(() => {
    const favs = getFavorites();
    setIsFavorite(favs.includes(vendor.id));
    
    // Batch API calls
    const fetchData = async () => {
      try {
        const [flagResponse, communityResponse] = await Promise.all([
          fetch('/api/flag-vendor'),
          fetch(`/api/community-vendors?placeId=${vendor.id}`)
        ]);

        const [flagData, communityData] = await Promise.all([
          flagResponse.json(),
          communityResponse.json()
        ]);

        if (flagData.flagged && flagData.flagged.some(f => f.vendorId === vendor.id)) {
          setIsFlagged(true);
        }

        if (communityData.vendor) {
          setCommunityData(communityData.vendor);
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      }
    };

    fetchData();
  }, [vendor.id]);

  const toggleFavorite = useCallback(async () => {
    const favs = getFavorites();
    let updated;
    const wasFavorite = favs.includes(vendor.id);
    
    if (wasFavorite) {
      updated = favs.filter(id => id !== vendor.id);
    } else {
      updated = [...favs, vendor.id];
    }
    setFavorites(updated);
    setIsFavorite(updated.includes(vendor.id));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
      detail: { favorites: updated }
    }));
    
    // Show toast message
    if (updated.includes(vendor.id)) {
      showSuccessToast(`Added ${vendor.name} to favorites!`);
    } else {
      showSuccessToast(`Removed ${vendor.name} from favorites`);
    }
    
    // Optimistically update community data immediately
    if (communityData) {
      const currentFavorites = communityData.totalFavorites || 0;
      const newFavorites = !wasFavorite ? currentFavorites + 1 : Math.max(0, currentFavorites - 1);
      
      setCommunityData(prev => ({
        ...prev,
        totalFavorites: newFavorites
      }));
    }
    
    // Send API request in background (don't wait for it)
    fetch('/api/community-vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeId: vendor.id,
        vendorName: vendor.name,
        vendorAddress: vendorData.address,
        vendorCategory: vendorData.category,
        userId: user?.uid || '',
        selectedAsVenue: false,
        selectedAsVendor: false,
        isFavorite: !wasFavorite
      })
    }).then(response => {
      if (!response.ok) {
        console.error('Community update failed:', response.status, response.statusText);
        // Revert optimistic update on failure
        if (communityData) {
          const currentFavorites = communityData.totalFavorites || 0;
          const revertedFavorites = !wasFavorite ? Math.max(0, currentFavorites - 1) : currentFavorites + 1;
          setCommunityData(prev => ({
            ...prev,
            totalFavorites: revertedFavorites
          }));
        }
        showSuccessToast('Failed to update community data');
      }
    }).catch(error => {
      console.error('Error updating community favorites:', error);
      // Revert optimistic update on error
      if (communityData) {
        const currentFavorites = communityData.totalFavorites || 0;
        const revertedFavorites = !wasFavorite ? Math.max(0, currentFavorites - 1) : currentFavorites + 1;
        setCommunityData(prev => ({
          ...prev,
          totalFavorites: revertedFavorites
        }));
      }
      showSuccessToast('Failed to update community data');
    });
  }, [vendor.id, vendor.name, vendorData, user?.uid, showSuccessToast]);

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
    
    // In normal mode, navigate to vendor detail page
    const baseUrl = location ? `/vendors/${vendor.id}?location=${encodeURIComponent(location)}&category=${encodeURIComponent(category)}` : `/vendors/${vendor.id}?category=${encodeURIComponent(category)}`;
    router.push(baseUrl);
  }, [bulkContactMode, onSelectionChange, vendor.id, location, router, category]);

  const handleImageError = useCallback(() => {
    setImgSrc('/Venue.png');
  }, []);

  const handleContactClick = useCallback(() => {
    if (onShowContactModal) {
      onShowContactModal(vendor);
    }
  }, [onShowContactModal, vendor]);

  const handleViewDetailsClick = useCallback(() => {
    const baseUrl = location ? `/vendors/${vendor.id}?location=${encodeURIComponent(location)}&category=${encodeURIComponent(category)}` : `/vendors/${vendor.id}?category=${encodeURIComponent(category)}`;
    router.push(baseUrl);
  }, [vendor.id, location, router, category]);

  const handleSelectionChange = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange(vendor.id);
    }
  }, [onSelectionChange, vendor.id]);

  return (
    <div 
      className={`group bg-white border rounded-[5px] p-4 flex flex-col items-start relative h-full min-h-[320px] cursor-pointer hover:shadow-lg hover:shadow-gray-300/50 transition-all duration-200 hover:-translate-y-1${isFlagged ? ' border-red-500' : ''}${isSelected ? ' border-[#A85C36] border-2' : ''}`}
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
          onClick={toggleFavorite}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${
            (isFavorite || isFavoriteOverride)
              ? 'bg-[#A85C36] text-white'
              : 'bg-white/80 text-gray-600 hover:bg-white'
          }`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-3 h-3 ${(isFavorite || isFavoriteOverride) ? 'fill-current' : ''}`} />
        </button>
      )}
      
      {/* Flag button */}
      {!bulkContactMode && !isFlagged && (
        <button
          className="absolute top-3 left-3 z-10 bg-white/80 rounded-full p-1 shadow hover:bg-red-100 text-xs text-red-600 border border-red-200"
          onClick={() => onShowFlagModal && onShowFlagModal(vendor)}
          aria-label="Flag vendor"
          style={{ border: 'none' }}
        >
          🚩 Flag
        </button>
      )}
      {!bulkContactMode && isFlagged && (
        <span className="absolute top-3 left-3 z-10 bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold border border-red-200">Flagged</span>
      )}
      
      <div className="w-full min-h-[128px] h-32 bg-[#F3F2F0] rounded mb-2 flex items-center justify-center overflow-hidden">
        <img
          src={imgSrc}
          alt={vendor.name}
          className={`w-full h-full ${isPlaceholder ? 'object-contain' : 'object-cover'}`}
          onError={handleImageError}
          loading="lazy"
        />
      </div>
      
      <div className="flex-1 w-full flex flex-col justify-between">
        <div>
          <h5 className="mb-1" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500, fontSize: '1.125rem', lineHeight: 1.5, color: '#332B42' }}>{vendor.name}</h5>
          <div className="flex items-center gap-1 text-xs mb-1">
            <span className="text-[#A85C36]">★ {vendor.rating}</span>
            <span className="text-[#332B42]">({vendor.reviewCount})</span>
          </div>
          {vendor.price && (
            <div className="text-xs text-[#332B42] mb-1">{vendor.price}</div>
          )}
          <div className="text-xs text-[#332B42] mb-1">{vendor.address || vendor.location}</div>
          {vendor.mainTypeLabel && (
            <div className="text-xs text-[#AB9C95] mb-1">{vendor.mainTypeLabel}</div>
          )}
          {vendor.source && vendor.source.url && (
            <a href={vendor.source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#A85C36] underline mb-2 block">{vendor.source.name}</a>
          )}
          
          {/* Community Favorites Metadata */}
          {communityData && communityData.totalFavorites > 0 && (
            <div className="flex items-center gap-1 text-xs text-[#364257] mb-1">
              <Heart className="w-3 h-3 text-pink-500 fill-current" />
              <span>Favorited by {communityData.totalFavorites} {communityData.totalFavorites === 1 ? 'user' : 'users'}</span>
            </div>
          )}
          
          {/* Vendor Email Badge */}
          <VendorEmailBadge placeId={vendor.id} className="mb-2" />
          
          {/* Price estimate badge */}
          {vendor.estimate && (
            <div className="mt-2 mb-1 px-3 py-1 bg-[#E6EEF6] text-[#364257] text-base font-semibold rounded shadow-sm">
              Estimate {vendor.estimate}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 w-full mt-auto md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
        <button 
          className="btn-primaryinverse flex-1" 
          onClick={handleContactClick}
          disabled={bulkContactMode}
        >
          Contact
        </button>
        <button 
          className="btn-primary flex-1" 
          onClick={handleViewDetailsClick}
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