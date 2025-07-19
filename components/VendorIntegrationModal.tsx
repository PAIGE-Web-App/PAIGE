import React, { useState } from 'react';
import { X, Search, Link } from 'lucide-react';
import type { BudgetItem } from '@/types/budget';

interface VendorIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetItem: BudgetItem;
  onLinkVendor: (itemId: string, vendorData: any) => void;
}

const VendorIntegrationModal: React.FC<VendorIntegrationModalProps> = ({
  isOpen,
  onClose,
  budgetItem,
  onLinkVendor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  // Mock vendor data - in real implementation, this would come from your vendor catalog
  const mockVendors = [
    { id: '1', name: 'Grand Hotel Ballroom', placeId: 'place1', price: 8000 },
    { id: '2', name: 'Elegant Catering Co', placeId: 'place2', price: 4500 },
    { id: '3', name: 'Perfect Photography', placeId: 'place3', price: 3200 },
  ];

  const filteredVendors = mockVendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLinkVendor = () => {
    if (selectedVendor) {
      onLinkVendor(budgetItem.id, {
        vendorId: selectedVendor.id,
        vendorName: selectedVendor.name,
        vendorPlaceId: selectedVendor.placeId,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-[5px] p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#332B42]">Link Vendor to Budget Item</h2>
          <button
            onClick={onClose}
            className="text-[#AB9C95] hover:text-[#332B42]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-[#332B42] mb-2">
            Linking vendor to: <span className="font-medium">{budgetItem.name}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              Search Vendors
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#AB9C95]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-[#AB9C95] rounded-[5px] pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
                placeholder="Search for vendors..."
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredVendors.length === 0 ? (
              <p className="text-sm text-[#AB9C95] text-center py-4">
                No vendors found. Try a different search term.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className={`p-3 border rounded-[5px] cursor-pointer transition-colors ${
                      selectedVendor?.id === vendor.id
                        ? 'border-[#A85C36] bg-[#F8F6F4]'
                        : 'border-[#AB9C95] hover:border-[#A85C36]'
                    }`}
                    onClick={() => setSelectedVendor(vendor)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-[#332B42]">{vendor.name}</h4>
                        <p className="text-sm text-[#AB9C95]">${vendor.price.toLocaleString()}</p>
                      </div>
                      {selectedVendor?.id === vendor.id && (
                        <Link className="w-4 h-4 text-[#A85C36]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0]"
          >
            Cancel
          </button>
          <button
            onClick={handleLinkVendor}
            disabled={!selectedVendor}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link className="w-4 h-4" />
            Link Vendor
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorIntegrationModal; 