import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Star, Heart, Clock } from 'lucide-react';
import { getRecentlyViewedVendors, mapGoogleTypesToCategory } from '@/utils/vendorUtils';
import BadgeCount from '@/components/BadgeCount';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useAuth } from '@/contexts/AuthContext';

interface RecentlyViewedSectionProps {
  defaultLocation: string;
  onContact?: (vendor: any) => void;
  onFlagged?: (vendorId: string) => void;
}

export const RecentlyViewedSection: React.FC<RecentlyViewedSectionProps> = ({
  defaultLocation,
  onContact,
  onFlagged
}) => {
  const router = useRouter();
  const { showSuccessToast } = useCustomToast();
  const { user } = useAuth();
  const [recentlyViewedVendors, setRecentlyViewedVendors] = useState<any[]>([]);
  const [enhancedVendors, setEnhancedVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load recently viewed vendors
  useEffect(() => {
    const recent = getRecentlyViewedVendors();
    setRecentlyViewedVendors(recent);
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFavorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
      setFavorites(storedFavorites);
    }
  }, []);

  // Enhance vendors with Google Places images
  useEffect(() => {
    const enhanceVendorsWithImages = async () => {
      if (recentlyViewedVendors.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const enhanced = await Promise.all(
        recentlyViewedVendors.map(async (vendor) => {
          try {
            // If vendor already has a Google Places image, use it
            if (vendor.image && vendor.image.includes('maps.googleapis.com')) {
              return vendor;
            }

            // If vendor has a placeId, fetch the latest image from Google Places
            if (vendor.placeId || vendor.id) {
              const placeId = vendor.placeId || vendor.id;
              
              // Fetch vendor photos from our API
              const response = await fetch(`/api/vendor-photos/${placeId}`);
              const data = await response.json();
              
              if (data.images && data.images.length > 0) {
                return {
                  ...vendor,
                  image: data.images[0], // Use the first image
                  images: data.images
                };
              }
            }
            
            // Return vendor as-is if no image found
            return vendor;
          } catch (error) {
            console.error('Error enhancing vendor with image:', error);
            return vendor;
          }
        })
      );

      setEnhancedVendors(enhanced);
      setLoading(false);
    };

    enhanceVendorsWithImages();
  }, [recentlyViewedVendors]);

  // Handle favorite toggle
  const toggleFavorite = async (vendorId: string) => {
    const newFavorites = favorites.includes(vendorId)
      ? favorites.filter(id => id !== vendorId)
      : [...favorites, vendorId];
    
    const wasFavorite = favorites.includes(vendorId);
    
    setFavorites(newFavorites);
    localStorage.setItem('vendorFavorites', JSON.stringify(newFavorites));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
      detail: { favorites: newFavorites }
    }));
    
    // Show toast message
    if (newFavorites.includes(vendorId)) {
      showSuccessToast('Added to favorites!');
    } else {
      showSuccessToast('Removed from favorites');
    }
    
    // Find the vendor data for community update
    const vendor = enhancedVendors.find(v => v.id === vendorId || v.placeId === vendorId);
    if (vendor && user?.uid) {
      // Send API request to update community favorites (don't wait for it)
      fetch('/api/community-vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: vendor.placeId || vendor.id,
          vendorName: vendor.name,
          vendorAddress: vendor.address || vendor.location || '',
          vendorCategory: vendor.category || 'Vendor',
          userId: user.uid,
          selectedAsVenue: false,
          selectedAsVendor: false,
          isFavorite: !wasFavorite
        })
      }).catch(error => {
        console.error('Error updating community favorites:', error);
        // Don't show error toast as the favorite was still added locally
      });
    }
  };

  // Handle vendor click
  const handleVendorClick = (vendor: any) => {
    const category = vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || '';
    router.push(`/vendors/${vendor.id}?category=${category}&location=${encodeURIComponent(defaultLocation)}`);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('paige_recently_viewed_vendors');
    setRecentlyViewedVendors([]);
    setEnhancedVendors([]);
  };

  // Cap at 10 most recently viewed vendors
  const maxRecentlyViewed = 10;
  const cappedVendors = enhancedVendors.slice(0, maxRecentlyViewed);

  // Show skeletons while loading, even if no vendors yet
  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#A85C36]" />
              <h5>Recently Viewed</h5>
            </div>
          </div>
        </div>
        
        {/* Horizontal Scroll Container with Skeletons */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="w-64 flex-shrink-0">
                <div className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
                  <div className="h-32 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Don't show section if no vendors and not loading
  if (recentlyViewedVendors.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#A85C36]" />
            <h5>Recently Viewed</h5>
          </div>
        </div>
        <button 
          className="text-sm text-[#A85C36] hover:text-[#332B42] transition-colors"
          onClick={handleClearHistory}
        >
          Clear History
        </button>
      </div>
      
      {/* Horizontal Scroll Container */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
          {cappedVendors.map((vendor) => (
              <div 
                key={vendor.id}
                className="w-64 flex-shrink-0 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleVendorClick(vendor)}
              >
                {/* Vendor Image */}
                <div className="relative h-32 bg-[#F3F2F0] rounded-t-lg overflow-hidden">
                  <img
                    src={vendor.image || '/Venue.png'}
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
                  <h6 className="mb-2 line-clamp-2 font-medium text-[#332B42]">
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
                  {(vendor.address || vendor.location) && (
                    <div className="flex items-start gap-1 text-xs text-[#364257]">
                      <MapPin className="w-3 h-3 text-[#A85C36] mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{vendor.address || vendor.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}; 