import React, { useState, useEffect } from 'react';
import { Store, ArrowRight, MapPin, Star, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getRecentlyViewedVendors, mapGoogleTypesToCategory } from '@/utils/vendorUtils';
import { enhanceVendorsWithImages } from '@/utils/vendorImageUtils';
import { useFavoritesSimple } from '@/hooks/useFavoritesSimple';

interface DashboardRecentlyViewedVendorsProps {
  isLoading?: boolean;
}

const DashboardRecentlyViewedVendors: React.FC<DashboardRecentlyViewedVendorsProps> = ({
  isLoading = false
}) => {
  const router = useRouter();
  const [recentVendors, setRecentVendors] = useState<any[]>([]);
  const [enhancedVendors, setEnhancedVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavoritesSimple();

  // Load recently viewed vendors
  useEffect(() => {
    const vendors = getRecentlyViewedVendors();
    setRecentVendors(vendors.slice(0, 3)); // Show only top 3 most recent
  }, []);

  // Enhance vendors with images
  useEffect(() => {
    const enhanceVendors = async () => {
      if (recentVendors.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const enhanced = await enhanceVendorsWithImages(recentVendors);
        setEnhancedVendors(enhanced);
      } catch (error) {
        console.error('Error enhancing vendors with images:', error);
        setEnhancedVendors(recentVendors); // Fallback to original data
      } finally {
        setLoading(false);
      }
    };

    enhanceVendors();
  }, [recentVendors]);

  // Handle vendor click
  const handleVendorClick = (vendor: any) => {
    const category = vendor.types && vendor.types.length > 0 
      ? mapGoogleTypesToCategory(vendor.types, vendor.name) 
      : vendor.category || '';
    const location = vendor.vicinity || vendor.formatted_address || '';
    router.push(`/vendors/${vendor.id}?category=${category}&location=${encodeURIComponent(location)}`);
  };

  if (isLoading || loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
                <div className="w-full h-32 bg-gray-200 animate-pulse"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Don't show if no vendors
  if (enhancedVendors.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-[#332B42] font-work">Recently Viewed Vendors</h3>
        </div>
        <button
          onClick={() => router.push('/vendors')}
          className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="View all vendors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Vendors Grid - Card Style */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {enhancedVendors.map((vendor, index) => {
            const imgSrc = vendor.image || '/Venue.png';
            // Try multiple location fields in order of preference
            const location = vendor.address || vendor.formatted_address || vendor.vicinity || 'Location not available';
            const rating = vendor.rating || 0;
            const reviewCount = vendor.user_ratings_total || vendor.reviewCount || vendor.totalReviews || 0;
            const vendorId = vendor.place_id || vendor.placeId || vendor.id;
            
            return (
              <div
                key={vendor.id || index}
                onClick={() => handleVendorClick(vendor)}
                className="bg-white border border-gray-200 rounded-[5px] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer relative group"
              >
                {/* Heart Icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite({
                      placeId: vendorId,
                      name: vendor.name,
                      address: location,
                      category: vendor.mainTypeLabel || 'Vendor',
                      rating: rating,
                      reviewCount: reviewCount,
                      image: imgSrc
                    });
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors z-20 shadow-md ${
                    isFavorite(vendorId)
                      ? 'bg-white/90 text-pink-500 hover:text-pink-600'
                      : 'bg-white/80 text-gray-600 hover:bg-white'
                  }`}
                  aria-label={isFavorite(vendorId) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-3 h-3 ${isFavorite(vendorId) ? 'fill-current text-pink-500' : ''}`} />
                </button>

                {/* Vendor Image */}
                <div className="w-full h-32 bg-[#F3F2F0] flex items-center justify-center overflow-hidden">
                  <img
                    src={imgSrc || '/Venue.png'}
                    alt={vendor.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/Venue.png';
                    }}
                  />
                </div>

                {/* Vendor Info */}
                <div className="p-3">
                  <h6 className="text-sm font-medium text-[#332B42] font-work mb-1 truncate">
                    {vendor.name || 'Unnamed Vendor'}
                  </h6>
                  
                  {/* Rating */}
                  {rating > 0 && (
                    <div className="flex items-center gap-1 text-xs mb-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-[#A85C36]">{rating.toFixed(1)}</span>
                      <span className="text-[#332B42]">({reviewCount})</span>
                    </div>
                  )}
                  
                  {/* Location */}
                  <div className="flex items-start gap-1 text-xs text-[#332B42] mb-1">
                    <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{location}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer link */}
        <div className="pt-3 border-t border-gray-100 mt-3">
          <button
            onClick={() => router.push('/vendors')}
            className="text-xs text-[#A85C36] font-work hover:text-[#8B4A2A] transition-colors"
          >
            Browse all vendors →
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardRecentlyViewedVendors;

