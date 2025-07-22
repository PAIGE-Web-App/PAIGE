import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import { getRecentlyViewedVendors, mapGoogleTypesToCategory } from '@/utils/vendorUtils';
import BadgeCount from '@/components/BadgeCount';
import { Clock } from 'lucide-react';

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
  const [recentlyViewedVendors, setRecentlyViewedVendors] = useState<any[]>([]);
  const [enhancedVendors, setEnhancedVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load recently viewed vendors
  useEffect(() => {
    const recent = getRecentlyViewedVendors();
    setRecentlyViewedVendors(recent);
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

  const handleClearHistory = () => {
    localStorage.removeItem('paige_recently_viewed_vendors');
    setRecentlyViewedVendors([]);
    setEnhancedVendors([]);
  };

  if (recentlyViewedVendors.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#A85C36]" />
            <h5>Recently Viewed</h5>
          </div>
          <BadgeCount count={recentlyViewedVendors.length} />
        </div>
        <button 
          className="text-sm text-[#A85C36] hover:text-[#332B42] transition-colors"
          onClick={handleClearHistory}
        >
          Clear History
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
          {loading ? (
            // Show loading skeletons
            Array.from({ length: Math.min(recentlyViewedVendors.length, 6) }).map((_, index) => (
              <div key={index} className="w-80 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                  <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                </div>
              </div>
            ))
          ) : (
            enhancedVendors.slice(0, 6).map((vendor) => (
              <div key={vendor.id} className="w-80 flex-shrink-0">
                <VendorCatalogCard
                  vendor={vendor}
                  onContact={() => onContact?.(vendor)}
                  onFlagged={(vendorId) => onFlagged?.(vendorId)}
                  onSelectionChange={() => {}}
                  location={defaultLocation}
                  category={vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || ''}
                />
              </div>
            ))
          )}
          {recentlyViewedVendors.length > 6 && (
            <div className="flex items-center justify-center w-40">
              <button
                className="text-sm text-[#A85C36] hover:text-[#332B42] underline font-medium transition-colors"
                onClick={() => router.push('/vendors/recently-viewed')}
              >
                View All
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}; 