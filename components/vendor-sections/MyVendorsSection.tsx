import React from 'react';
import { useRouter } from 'next/navigation';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import { convertVendorToCatalogFormat, mapGoogleTypesToCategory } from '@/utils/vendorUtils';
import BadgeCount from '@/components/BadgeCount';
import { Star } from 'lucide-react';

interface MyVendorsSectionProps {
  vendors: any[];
  defaultLocation: string;
  isLoading?: boolean;
  onContact?: (vendor: any) => void;
  onFlagged?: (vendorId: string) => void;
}

export const MyVendorsSection: React.FC<MyVendorsSectionProps> = ({
  vendors,
  defaultLocation,
  isLoading = false,
  onContact,
  onFlagged
}) => {
  const router = useRouter();

  return (
    <section className="mb-8">
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-[960px]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white border rounded-[5px] p-4 h-[320px] w-80 animate-pulse">
              <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No vendors found</div>
          <button 
            className="btn-primary"
            onClick={() => router.push('/vendors/catalog')}
          >
            Browse Vendor Catalog
          </button>
        </div>
      ) : (
        <>
          {/* 2x4 Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {vendors.slice(0, 8).map((vendor) => (
              <div key={vendor.id} className="w-full">
                <VendorCatalogCard
                  vendor={convertVendorToCatalogFormat(vendor)}
                  onContact={() => onContact?.(vendor)}
                  onFlagged={(vendorId) => onFlagged?.(vendorId)}
                  onSelectionChange={() => {}}
                  location={defaultLocation}
                  category={vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || ''}
                />
              </div>
            ))}
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