import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      onLinkVendor(budgetItem.id!, {
        vendorId: selectedVendor.id,
        vendorName: selectedVendor.name,
        vendorPlaceId: selectedVendor.placeId,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose} // Close modal when clicking outside
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
          onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <h5 className="h5 mb-4 text-center">Link Vendor to Budget Item</h5>

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
                        <h6 className="h6">{vendor.name}</h6>
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

        <div className="flex justify-center w-full mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0]"
          >
            Cancel
          </button>
          <button
            onClick={handleLinkVendor}
            disabled={!selectedVendor}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link className="w-4 h-4" />
            Link Vendor
          </button>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VendorIntegrationModal; 