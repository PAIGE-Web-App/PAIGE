"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useFavoritesSimple } from '@/hooks/useFavoritesSimple';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import { 
  convertVendorToCatalogFormat,
  mapGoogleTypesToCategory
} from '@/utils/vendorUtils';

export default function MyFavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { weddingLocation } = useUserProfileData();
  const { favorites, isLoading: favoritesLoading } = useFavoritesSimple();
  
  const [isLoading, setIsLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('recent-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const defaultLocation = weddingLocation || 'United States';

  // The simplified favorites hook already returns full vendor data
  const favoriteVendors = favorites;

  // Calculate category counts
  useEffect(() => {
    const counts: Record<string, number> = {};
    favoriteVendors.forEach(vendor => {
      const category = vendor.category || 'Other';
      counts[category] = (counts[category] || 0) + 1;
    });
    setCategoryCounts(counts);
  }, [favoriteVendors]);

  // Filter and sort vendors
  const filteredFavorites = useMemo(() => {
    let filtered = favoriteVendors;

    // Filter by search
    if (vendorSearch) {
      filtered = filtered.filter(vendor =>
        vendor.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        vendor.address?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        vendor.category?.toLowerCase().includes(vendorSearch.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(vendor =>
        selectedCategories.includes(vendor.category || 'Other')
      );
    }

    // Sort
    switch (sortOption) {
      case 'name-asc':
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name-desc':
        filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'rating-desc':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'rating-asc':
        filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      case 'recent-desc':
      default:
        // Keep original order (most recent first)
        break;
    }

    return filtered;
  }, [favoriteVendors, vendorSearch, selectedCategories, sortOption]);

  // Set loading state
  useEffect(() => {
    setIsLoading(favoritesLoading);
  }, [favoritesLoading]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-playfair font-bold text-[#332B42] mb-2">
            My Favorites
          </h1>
          <p className="text-[#5A4A42]">
            {favoriteVendors.length} {favoriteVendors.length === 1 ? 'vendor' : 'vendors'} saved
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search favorites..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A85C36] focus:border-transparent"
            />
          </div>

          {/* Category Filters */}
          {Object.keys(categoryCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategories([])}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedCategories.length === 0
                    ? 'bg-[#A85C36] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({favoriteVendors.length})
              </button>
              {Object.entries(categoryCounts).map(([category, count]) => (
                <button
                  key={category}
                  onClick={() => {
                    if (selectedCategories.includes(category)) {
                      setSelectedCategories(selectedCategories.filter(c => c !== category));
                    } else {
                      setSelectedCategories([...selectedCategories, category]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedCategories.includes(category)
                      ? 'bg-[#A85C36] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category} ({count})
                </button>
              ))}
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-4">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A85C36] focus:border-transparent"
            >
              <option value="recent-desc">Recently Added</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="rating-desc">Highest Rated</option>
              <option value="rating-asc">Lowest Rated</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {filteredFavorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💔</div>
            <h3 className="text-xl font-playfair font-medium text-[#332B42] mb-2">
              {vendorSearch || selectedCategories.length > 0 ? 'No matching favorites' : 'No favorites yet'}
            </h3>
            <p className="text-[#5A4A42] mb-6">
              {vendorSearch || selectedCategories.length > 0 
                ? 'Try adjusting your search or filters'
                : 'Start browsing vendors and add them to your favorites!'
              }
            </p>
            {!vendorSearch && selectedCategories.length === 0 && (
              <button
                onClick={() => router.push('/vendors')}
                className="btn-primary"
              >
                Browse Vendors
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFavorites.map((vendor) => {
              const convertedVendor = convertVendorToCatalogFormat(vendor);
              
              if (!convertedVendor) return null;
              
              return (
                <div key={vendor.placeId} className="w-full">
                  <VendorCatalogCard
                    vendor={convertedVendor}
                    onContact={() => {
                      // Handle contact
                    }}
                    onFlagged={(vendorId) => {
                      // Handle flag
                    }}
                    onSelectionChange={() => {}}
                    // Force heart filled for favorites
                    isFavoriteOverride={true}
                    location={defaultLocation}
                    category={vendor.category || 'Vendor'}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}