"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Star, ExternalLink, Heart, Trash2 } from 'lucide-react';
import { useCustomToast } from '../../../hooks/useCustomToast';

interface VendorMetadata {
  place_id: string;
  name: string;
  formatted_address: string;
  website: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  category: string;
}

interface SelectedVendors {
  [key: string]: VendorMetadata[];
}

const CATEGORY_LABELS: { [key: string]: string } = {
  venue: 'Venue',
  photographer: 'Photographer',
  florist: 'Florist',
  caterer: 'Caterer',
  dj: 'DJ/Band',
  officiant: 'Officiant'
};

const CATEGORY_ICONS: { [key: string]: string } = {
  venue: '🏛️',
  photographer: '📸',
  florist: '🌸',
  caterer: '🍽️',
  dj: '🎵',
  officiant: '👰'
};

export default function SelectedVendorsTab() {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [selectedVendors, setSelectedVendors] = useState<SelectedVendors>({});
  const [loading, setLoading] = useState(true);

  // Load selected vendors on mount
  useEffect(() => {
    if (!user?.uid) return;

    const loadSelectedVendors = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        
        if (userData?.selectedVendors) {
          setSelectedVendors(userData.selectedVendors);
        }
      } catch (error) {
        console.error('Error loading selected vendors:', error);
        showErrorToast('Failed to load selected vendors');
      } finally {
        setLoading(false);
      }
    };

    loadSelectedVendors();
  }, [user?.uid, showErrorToast]);

  // Remove vendor from selected list
  const handleRemoveVendor = async (category: string, vendorId: string) => {
    if (!user?.uid) return;

    try {
      const updatedSelectedVendors = {
        ...selectedVendors,
        [category]: selectedVendors[category].filter(v => v.place_id !== vendorId)
      };

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        selectedVendors: updatedSelectedVendors
      });

      setSelectedVendors(updatedSelectedVendors);
      showSuccessToast('Vendor removed from selected list');
    } catch (error) {
      console.error('Error removing vendor:', error);
      showErrorToast('Failed to remove vendor');
    }
  };

  // Clear all vendors from a category
  const handleClearCategory = async (category: string) => {
    if (!user?.uid) return;

    try {
      const updatedSelectedVendors = {
        ...selectedVendors,
        [category]: []
      };

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        selectedVendors: updatedSelectedVendors
      });

      setSelectedVendors(updatedSelectedVendors);
      showSuccessToast(`All ${CATEGORY_LABELS[category]} vendors cleared`);
    } catch (error) {
      console.error('Error clearing category:', error);
      showErrorToast('Failed to clear category');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalSelectedVendors = Object.values(selectedVendors).reduce((sum, vendors) => sum + vendors.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-playfair font-semibold text-[#332B42] mb-2">
            Selected Vendors
          </h2>
          <p className="text-gray-600">
            Manage your selected vendors for personalized AI content generation
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#A85C36]">{totalSelectedVendors}</div>
          <div className="text-sm text-gray-500">Total Selected</div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {Object.entries(CATEGORY_LABELS).map(([categoryKey, categoryLabel]) => {
          const vendors = selectedVendors[categoryKey] || [];
          const icon = CATEGORY_ICONS[categoryKey];

          return (
            <motion.div
              key={categoryKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#332B42]">
                      {categoryLabel}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {vendors.length} selected
                    </p>
                  </div>
                </div>
                {vendors.length > 0 && (
                  <button
                    onClick={() => handleClearCategory(categoryKey)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Trash2 size={16} />
                    Clear All
                  </button>
                )}
              </div>

              {/* Vendors List */}
              <AnimatePresence>
                {vendors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl mb-2 block">{icon}</span>
                    <p>No {categoryLabel.toLowerCase()} selected yet</p>
                    <p className="text-sm">Visit the vendor catalog to select your favorites</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {vendors.map((vendor, index) => (
                      <motion.div
                        key={vendor.place_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-[#332B42] truncate">
                              {vendor.name}
                            </h4>
                            {vendor.rating && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                <span>{vendor.rating}</span>
                                {vendor.user_ratings_total && (
                                  <span>({vendor.user_ratings_total})</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin size={14} />
                            <span className="truncate">{vendor.formatted_address}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {vendor.website && (
                            <a
                              href={vendor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-500 hover:text-[#A85C36] transition-colors"
                              title="Visit website"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => handleRemoveVendor(categoryKey, vendor.place_id)}
                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                            title="Remove from selected"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {totalSelectedVendors === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-[#332B42] mb-2">
            No Selected Vendors Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Start building your vendor team by selecting your favorites from the catalog
          </p>
          <a
            href="/vendors"
            className="btn-primary inline-flex items-center gap-2"
          >
            Browse Vendors
          </a>
        </motion.div>
      )}
    </div>
  );
}
