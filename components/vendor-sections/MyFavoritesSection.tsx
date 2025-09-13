import React from 'react';
import { useRouter } from 'next/navigation';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import { convertVendorToCatalogFormat, mapGoogleTypesToCategory } from '@/utils/vendorUtils';
import BadgeCount from '@/components/BadgeCount';
import { Heart } from 'lucide-react';
import { VendorHubEmptyState } from '@/components/VendorHubEmptyState';

interface MyFavoritesSectionProps {
  vendors: any[];
  defaultLocation: string;
  onContact?: (vendor: any) => void;
  onFlagged?: (vendorId: string) => void;
  onShowContactModal?: (vendor: any) => void;
  onShowFlagModal?: (vendor: any) => void;
  onMobileSelect?: (vendor: any) => void;
}

export const MyFavoritesSection: React.FC<MyFavoritesSectionProps> = ({
  vendors,
  defaultLocation,
  onContact,
  onFlagged,
  onShowContactModal,
  onShowFlagModal,
  onMobileSelect
}) => {
  const router = useRouter();

  if (vendors.length === 0) {
    return (
      <section className="mb-8 w-full">
        <VendorHubEmptyState 
          variant="favorites"
          imageSize="w-56"
          className="py-12"
        />
      </section>
    );
  }

  return (
    <section className="mb-8 w-full">
      {/* 2x4 Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {vendors.slice(0, 8)
          .map((vendor, index) => ({ vendor, index }))
          .filter(({ vendor }) => vendor && convertVendorToCatalogFormat(vendor))
          .map(({ vendor, index }) => {
            const convertedVendor = convertVendorToCatalogFormat(vendor);
            if (!convertedVendor) return null;
            
            return (
              <div key={`${vendor.placeId || vendor.id || 'vendor'}-${index}`} className="w-full">
                <VendorCatalogCard
                  vendor={convertedVendor}
                  onContact={() => onContact?.(vendor)}
                  onFlagged={(vendorId) => onFlagged?.(vendorId)}
                  onSelectionChange={() => {}}
                  // Force heart filled
                  isFavoriteOverride={true}
                  location={defaultLocation}
                  category={vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || ''}
                  onShowContactModal={onShowContactModal}
                  onShowFlagModal={onShowFlagModal}
                  onMobileSelect={() => onMobileSelect?.(vendor)}
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
            onClick={() => router.push('/vendors/my-favorites')}
          >
            View All My Favorites ({vendors.length})
          </button>
        </div>
      )}
    </section>
  );
}; 