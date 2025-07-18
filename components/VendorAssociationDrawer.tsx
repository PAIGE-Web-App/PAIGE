import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building, ArrowLeft } from 'lucide-react';
import VendorSearchField from './VendorSearchField';

interface VendorAssociationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contact: any;
  selectedVendor: any;
  onVendorSelect: (vendor: any) => void;
  userId: string;
}

export default function VendorAssociationDrawer({
  isOpen,
  onClose,
  contact,
  selectedVendor,
  onVendorSelect,
  userId
}: VendorAssociationDrawerProps) {
  
  // Get relevant categories based on contact category
  const getRelevantCategories = (contactCategory: string): string[] => {
    // If no category is selected, search across all wedding vendor categories
    if (!contactCategory || contactCategory === '') {
      return ['jewelry_store', 'florist', 'bakery', 'restaurant', 'hair_care', 'photographer', 'videographer', 'clothing_store', 'beauty_salon', 'spa', 'dj', 'band', 'wedding_planner', 'caterer', 'car_rental', 'travel_agency', 'officiant', 'suit_rental', 'makeup_artist', 'stationery', 'rentals', 'favors'];
    }

    // If category is selected, map to specific Google Places types
    const categoryToGoogleTypes: Record<string, string[]> = {
      'Jewelry': ['jewelry_store'],
      'Florist': ['florist'],
      'Bakery': ['bakery'],
      'Reception Venue': ['restaurant'],
      'Hair & Beauty': ['hair_care', 'beauty_salon'],
      'Photographer': ['photographer'],
      'Videographer': ['videographer'],
      'Bridal Salon': ['clothing_store'],
      'Beauty Salon': ['beauty_salon'],
      'Spa': ['spa'],
      'DJ': ['dj'],
      'Band': ['band'],
      'Wedding Planner': ['wedding_planner'],
      'Catering': ['caterer'],
      'Car Rental': ['car_rental'],
      'Travel Agency': ['travel_agency'],
      'Officiant': ['officiant'],
      'Suit/Tux Rental': ['suit_rental'],
      'Makeup Artist': ['makeup_artist'],
      'Stationery': ['stationery'],
      'Rentals': ['rentals'],
      'Favors': ['favors']
    };

    // Get the relevant Google Places types for this category
    const relevantTypes = categoryToGoogleTypes[contactCategory] || [];
    
    // If we have specific types, use them; otherwise fall back to all categories
    return relevantTypes.length > 0 ? relevantTypes : ['jewelry_store', 'florist', 'bakery', 'restaurant', 'hair_care', 'photographer', 'videographer', 'clothing_store', 'beauty_salon', 'spa', 'dj', 'band', 'wedding_planner', 'caterer', 'car_rental', 'travel_agency', 'officiant', 'suit_rental', 'makeup_artist', 'stationery', 'rentals', 'favors'];
  };
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 items-end justify-center z-50">       <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white rounded-t-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">           <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Link Contact to Vendor
                </h2>
                <p className="text-sm text-gray-600">
                  Associate this contact with a vendor to help the community
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">          {/* Left Panel - Contact Info */}
            <div className="w-1/2 p-6 border-r overflow-y-auto">              <div className="space-y-6">        {/* Contact Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">Contact Information</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: '#A85C36' }}
                    >
                      {contact?.name?.slice(0, 2).toUpperCase() || 'NA'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{contact?.name || 'Unnamed Contact'}</p>
                      <p className="text-sm text-gray-600">{contact?.email || 'No email'}</p>
                      {contact?.phone && (
                        <p className="text-sm text-gray-600">{contact.phone}</p>
                      )}
                    </div>
                  </div>
                  {contact?.category && (
                    <span className="inline-block px-2 bg-blue-100 text-blue-800 text-xs rounded">
                      {contact.category}
                    </span>
                  )}
                </div>

                {/* Vendor Search */}
                <div>
                  <h3 className="font-medium text-gray-900">Search for Vendor</h3>
                  <VendorSearchField
                    value={selectedVendor}
                    onChange={onVendorSelect}
                    onClear={() => onVendorSelect(null)}
                    placeholder={contact?.category ? `Search for ${contact.category} vendors...` : "Search for any wedding vendor..."}
                    categories={getRelevantCategories(contact?.category)}
                    location="United States"
                  />
                </div>

                {/* Selected Vendor Info */}
                {selectedVendor && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">Selected Vendor</h3>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <Building className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">                   <div className="font-medium text-gray-900">
                          {selectedVendor.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {selectedVendor.formatted_address}
                        </div>
                        {selectedVendor.rating && (
                          <div className="text-sm text-yellow-600 mt-1">
                            ★ {selectedVendor.rating}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Info */}
            <div className="w-1/6 overflow-y-auto">              <div className="space-y-6">
                <div className="text-center">
                  <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Vendor Association
                  </h3>
                  <p className="text-gray-600 mb-4">
                    By linking this contact to a vendor, you're helping other users find verified contact information.
                  </p>
                  
                  {selectedVendor ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900">Ready to Associate</h4>
                      <p className="text-sm text-green-700">
                        This contact will be linked to <strong>{selectedVendor.name}</strong>. 
                        You can manage email associations after saving the contact.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">Select a Vendor</h4>
                      <p className="text-sm text-gray-600">
                        Choose a vendor from the left panel to associate with this contact.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 