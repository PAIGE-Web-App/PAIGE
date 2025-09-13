import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { getRecentlyViewedVendors, mapGoogleTypesToCategory } from '@/utils/vendorUtils';
import { enhanceVendorsWithImages } from '@/utils/vendorImageUtils';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import { convertVendorToCatalogFormat } from '@/utils/vendorUtils';
import BadgeCount from '@/components/BadgeCount';

interface RecentlyViewedSectionProps {
  defaultLocation: string;
  onContact?: (vendor: any) => void;
  onFlagged?: (vendorId: string) => void;
  onShowContactModal?: (vendor: any) => void;
  onShowFlagModal?: (vendor: any) => void;
}

export const RecentlyViewedSection: React.FC<RecentlyViewedSectionProps> = ({
  defaultLocation,
  onContact,
  onFlagged,
  onShowContactModal,
  onShowFlagModal
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

  // Enhance vendors with unified image handling
  useEffect(() => {
    const enhanceVendors = async () => {
      if (recentlyViewedVendors.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const enhanced = await enhanceVendorsWithImages(recentlyViewedVendors);
        setEnhancedVendors(enhanced);
      } catch (error) {
        console.error('Error enhancing vendors with images:', error);
        setEnhancedVendors(recentlyViewedVendors);
      } finally {
        setLoading(false);
      }
    };

    enhanceVendors();
  }, [recentlyViewedVendors]);

  // Handle vendor click
  const handleVendorClick = (vendor: any) => {
    const category = vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || '';
    router.push(`/vendors/${vendor.id}?category=${category}&location=${encodeURIComponent(defaultLocation)}`);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('paige_recently_viewed_vendors');
    setRecentlyViewedVendors([]);
    setEnhancedVendors([]);
    
    // Dispatch custom event to notify parent components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('historyCleared'));
    }
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
              <BadgeCount count={cappedVendors.length} />
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
            <BadgeCount count={cappedVendors.length} />
          </div>
        </div>
        <button 
          className="text-sm text-[#A85C36] hover:text-[#332B42] transition-colors"
          onClick={handleClearHistory}
        >
          Clear History
        </button>
      </div>
      
      {/* Horizontal Scroll Container with VendorCatalogCard */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
          {cappedVendors
            .map((vendor, index) => ({ vendor, index }))
            .filter(({ vendor }) => vendor && convertVendorToCatalogFormat(vendor))
            .map(({ vendor, index }) => {
              const convertedVendor = convertVendorToCatalogFormat(vendor);
              if (!convertedVendor) return null;
              
              return (
                <div key={`${vendor.placeId || vendor.id || 'vendor'}-${index}`} className="w-64 flex-shrink-0">
                  <VendorCatalogCard
                    vendor={convertedVendor}
                    onContact={() => onContact?.(vendor)}
                    onFlagged={(vendorId) => onFlagged?.(vendorId)}
                    onSelectionChange={() => {}}
                    location={defaultLocation}
                    category={vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || ''}
                    onShowContactModal={() => onShowContactModal?.(vendor)}
                    onShowFlagModal={() => onShowFlagModal?.(vendor)}
                  />
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}; 