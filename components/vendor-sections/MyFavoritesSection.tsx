import React from 'react';
import { useRouter } from 'next/navigation';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import { convertVendorToCatalogFormat, mapGoogleTypesToCategory } from '@/utils/vendorUtils';
import BadgeCount from '@/components/BadgeCount';
import { Heart } from 'lucide-react';

interface MyFavoritesSectionProps {
  vendors: any[];
  defaultLocation: string;
  onContact?: (vendor: any) => void;
  onFlagged?: (vendorId: string) => void;
}

export const MyFavoritesSection: React.FC<MyFavoritesSectionProps> = ({
  vendors,
  defaultLocation,
  onContact,
  onFlagged
}) => {
  const router = useRouter();

  if (vendors.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
          {vendors.slice(0, 6).map((vendor) => (
            <div key={vendor.id} className="w-80 flex-shrink-0">
              <VendorCatalogCard
                vendor={convertVendorToCatalogFormat(vendor)}
                onContact={() => onContact?.(vendor)}
                onFlagged={(vendorId) => onFlagged?.(vendorId)}
                onSelectionChange={() => {}}
                // Force heart filled
                isFavoriteOverride={true}
                location={defaultLocation}
                category={vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || ''}
              />
            </div>
          ))}
          {vendors.length > 6 && (
            <div className="flex items-center justify-center w-40">
              <button
                className="text-sm text-[#A85C36] hover:text-[#332B42] underline font-medium transition-colors"
                onClick={() => router.push('/vendors/favorites')}
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