import React from 'react';
import { useRouter } from 'next/navigation';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import { convertVendorToCatalogFormat, mapGoogleTypesToCategory } from '@/utils/vendorUtils';
import BadgeCount from '@/components/BadgeCount';
import { Star } from 'lucide-react';
import { VendorHubEmptyState } from '@/components/VendorHubEmptyState';

interface MyVendorsSectionProps {
  vendors: any[];
  defaultLocation: string;
  isLoading?: boolean;
  onContact?: (vendor: any) => void;
  onFlagged?: (vendorId: string) => void;
  onShowContactModal?: (vendor: any) => void;
  onShowFlagModal?: (vendor: any) => void;
  onMobileSelect?: (vendor: any) => void;
  selectedVenuePlaceId?: string | null;
  selectedVendors?: { [key: string]: any[] };
}

export const MyVendorsSection: React.FC<MyVendorsSectionProps> = ({
  vendors,
  defaultLocation,
  isLoading = false,
  onContact,
  onFlagged,
  onShowContactModal,
  onShowFlagModal,
  onMobileSelect,
  selectedVenuePlaceId,
  selectedVendors = {}
}) => {
  const router = useRouter();

  // Helper function to check if vendor is selected for their category
  const isVendorSelected = (vendor: any): { isSelected: boolean; category: string } => {
    if (!selectedVendors || !vendor.placeId) {
      return { isSelected: false, category: '' };
    }

    const category = mapGoogleTypesToCategory(vendor.types, vendor.name);
    const categoryKey = category.toLowerCase().replace(/[^a-z0-9]/g, '');
    const categoryVendors = selectedVendors[categoryKey] || [];
    
    const isSelected = categoryVendors.some((v: any) => v.place_id === vendor.placeId);
    return { isSelected, category };
  };

  return (
    <section className="mb-8 w-full">
      
      {isLoading ? (
        <div className="w-full min-w-0" style={{ width: '100%', maxWidth: 'none' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full" style={{ width: '100%', maxWidth: 'none' }}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white border rounded-[5px] p-4 h-[320px] w-full animate-pulse min-w-0" style={{ width: '100%', maxWidth: 'none' }}>
                <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
              ) : vendors.length === 0 ? (
          <VendorHubEmptyState 
            variant="my-vendors"
            imageSize="w-56"
            className="py-12"
          />
      ) : (
        <>
          {/* 2x4 Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {vendors.slice(0, 8)
              .map((vendor, index) => ({ vendor, index }))
              .filter(({ vendor }) => vendor && convertVendorToCatalogFormat(vendor))
              .map(({ vendor, index }) => {
                const convertedVendor = convertVendorToCatalogFormat(vendor);
                if (!convertedVendor) return null;
                
                const { isSelected, category } = isVendorSelected(vendor);
                return (
                  <div key={`${vendor.placeId || vendor.id || 'vendor'}-${index}`} className="w-full">
                    <VendorCatalogCard
                      vendor={convertedVendor}
                      onContact={() => onContact?.(vendor)}
                      onFlagged={(vendorId) => onFlagged?.(vendorId)}
                      onSelectionChange={() => {}}
                      location={defaultLocation}
                      category={vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || ''}
                      onShowContactModal={onShowContactModal}
                      onShowFlagModal={onShowFlagModal}
                      onMobileSelect={() => onMobileSelect?.(vendor)}
                      isSelectedVenue={selectedVenuePlaceId === vendor.placeId}
                      isSelectedVendor={isSelected}
                      selectedCategory={category}
                    />
                  </div>
                );
              })}
          </div>
          
          {/* View All Link */}
          {vendors.length > 8 && (
            <div className="text-center">
              <button
                className="text-sm text-[#A85C36] hover:text-[#332B42] underline font-medium transition-colors"
                onClick={() => router.push('/vendors/my-vendors')}
              >
                View All My Vendors ({vendors.length})
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}; 