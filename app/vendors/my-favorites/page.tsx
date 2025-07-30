"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors } from '@/lib/getContacts';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListFilter, Search, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import VendorSkeleton from '@/components/VendorSkeleton';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import { 
  convertVendorToCatalogFormat,
  mapGoogleTypesToCategory
} from '@/utils/vendorUtils';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { enhanceVendorsWithImages } from '@/utils/vendorImageUtils';

export default function MyFavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { weddingLocation } = useUserProfileData();
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [favoriteVendors, setFavoriteVendors] = useState<any[]>([]);
  const [enhancedFavoriteVendors, setEnhancedFavoriteVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('recent-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const defaultLocation = weddingLocation || 'United States';

  // Helper to get favorite vendor IDs from localStorage
  function getFavoriteVendorIds() {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
    } catch {
      return [];
    }
  }

  // Update favorite vendors when vendors or favorites change
  useEffect(() => {
    const updateFavorites = () => {
      const favIds = getFavoriteVendorIds();
      
      // Get recently viewed vendors from localStorage
      const getRecentlyViewedVendors = () => {
        if (typeof window === 'undefined') return [];
        try {
          return JSON.parse(localStorage.getItem('paige_recently_viewed_vendors') || '[]');
        } catch {
          return [];
        }
      };
      
      const recentlyViewedVendors = getRecentlyViewedVendors();
      
      // Find vendor data in user's vendors list
      const favsFromUserVendors = favIds
        .map((id: string) => vendors.find((v) => v.id === id || v.placeId === id))
        .filter(Boolean);
      
      // Find vendor data in recently viewed vendors list
      const favsFromRecentlyViewed = favIds
        .map((id: string) => recentlyViewedVendors.find((v) => v.id === id || v.placeId === id))
        .filter(Boolean);
      
      // Combine both lists, removing duplicates
      const allFavs = [...favsFromUserVendors];
      favsFromRecentlyViewed.forEach(recentlyViewedVendor => {
        if (!allFavs.some(v => v.id === recentlyViewedVendor.id || v.placeId === recentlyViewedVendor.placeId)) {
          allFavs.push(recentlyViewedVendor);
        }
      });
      
      setFavoriteVendors(allFavs);
    };
    updateFavorites();
    
    // Listen for both storage events (from other tabs) and custom events (from same tab)
    window.addEventListener('storage', updateFavorites);
    window.addEventListener('vendorFavoritesChanged', updateFavorites);
    
    return () => {
      window.removeEventListener('storage', updateFavorites);
      window.removeEventListener('vendorFavoritesChanged', updateFavorites);
    };
  }, [vendors]);

  // Enhance favorite vendors with unified image handling
  useEffect(() => {
    const enhanceFavorites = async () => {
      if (favoriteVendors.length === 0) {
        setEnhancedFavoriteVendors([]);
        return;
      }

      try {
        console.log('🖼️ Enhancing My Favorites with images:', favoriteVendors.length, 'vendors');
        const enhanced = await enhanceVendorsWithImages(favoriteVendors);
        setEnhancedFavoriteVendors(enhanced);
        console.log('✅ Enhanced My Favorites with images:', enhanced.length, 'vendors');
      } catch (error) {
        console.error('Error enhancing favorite vendors with images:', error);
        setEnhancedFavoriteVendors(favoriteVendors);
      }
    };

    enhanceFavorites();
  }, [favoriteVendors]);

  // Filtered, searched, and sorted favorites
  const filteredFavorites = useMemo(() => {
    // Use enhanced favorite vendors if available, otherwise fall back to original favorites
    const favoritesToFilter = enhancedFavoriteVendors.length > 0 ? enhancedFavoriteVendors : favoriteVendors;
    
    let filtered = favoritesToFilter.filter((v) => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(v.category);
      const matchesSearch = vendorSearch.trim() === '' || v.name.toLowerCase().includes(vendorSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    // Apply sorting
    switch (sortOption) {
      case 'name-asc':
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return [...filtered].sort((a, b) => b.name.localeCompare(a.name));
      case 'recent-desc':
        return [...filtered].sort((a, b) => {
          // Use orderIndex if available (negative timestamp for recent first)
          if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
            return a.orderIndex - b.orderIndex;
          }
          
          // Fallback to addedAt timestamp
          const aTime = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const bTime = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
      case 'category-asc':
        return [...filtered].sort((a, b) => {
          const categoryA = a.category || '';
          const categoryB = b.category || '';
          return categoryA.localeCompare(categoryB);
        });
      case 'rating-desc':
        return [...filtered].sort((a, b) => {
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          return ratingB - ratingA;
        });
      default:
        return filtered;
    }
  }, [favoriteVendors, selectedCategories, vendorSearch, sortOption]);

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);
      getAllVendors(user.uid).then((data) => {
        console.log('🏪 My Favorites - Loaded vendors from Firestore:', JSON.stringify(data, null, 2));
        
        // Sort vendors by most recently added first
        const sortedVendors = data.sort((a, b) => {
          // Use orderIndex if available (negative timestamp for recent first)
          if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
            return a.orderIndex - b.orderIndex;
          }
          
          // Fallback to addedAt timestamp
          const aTime = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const bTime = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
        
        setVendors(sortedVendors);
        
        // Count categories for favorites
        const counts: Record<string, number> = {};
        sortedVendors.forEach((vendor) => {
          if (vendor.category && getFavoriteVendorIds().includes(vendor.id)) {
            counts[vendor.category] = (counts[vendor.category] || 0) + 1;
          }
        });
        setCategoryCounts(counts);
        setIsLoading(false);
      }).catch((error) => {
        console.error('Error loading vendors:', error);
        setIsLoading(false);
      });
    }
  }, [user]);

  // Helper function to identify Firestore document IDs
  const isFirestoreDocumentId = (category) => {
    return typeof category === 'string' && /^[a-zA-Z0-9_-]{15,}$/.test(category);
  };

  // Get unique categories, sorted alphabetically, filtering out Firestore document IDs
  const categories = Object.keys(categoryCounts)
    .filter(cat => !isFirestoreDocumentId(cat))
    .sort((a, b) => a.localeCompare(b));

  // Function to handle sort option selection
  const handleSortOptionSelect = (option: string) => {
    setSortOption(option);
    setShowSortMenu(false);
  };

  // Close sort menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showSortMenu && !(event.target as Element).closest('.sort-menu')) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu]);

  // Close filter menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showFilterMenu && !(event.target as Element).closest('.filter-menu')) {
        setShowFilterMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="app-content-container">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/vendors')}
              className="text-sm text-[#A85C36] hover:text-[#332B42] transition-colors"
            >
              ← Back to Vendor Hub
            </button>
            <h1 className="text-2xl font-playfair font-semibold text-[#332B42]">
              My Favorites
            </h1>
            <span className="text-sm text-[#7A7A7A]">
              {enhancedFavoriteVendors.length > 0 ? enhancedFavoriteVendors.length : favoriteVendors.length} favorite{enhancedFavoriteVendors.length > 0 ? (enhancedFavoriteVendors.length !== 1 ? 's' : '') : (favoriteVendors.length !== 1 ? 's' : '')}
            </span>
          </div>
          <button
            onClick={() => router.push('/vendors/catalog')}
            className="btn-primary"
          >
            Add Vendor
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            placeholder="Search favorites..."
            className="w-full px-3 py-2 border border-[#E0D6D0] rounded-lg text-sm text-[#332B42] focus:outline-none focus:border-[#A85C36]"
          />
        </div>
        
        <div className="flex gap-2">
          {/* Sort Button */}
          <div className="relative sort-menu">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E0D6D0] rounded-lg text-sm text-[#332B42] hover:bg-[#F3F2F0] transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort
            </button>
            
            {showSortMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-[#E0D6D0] rounded-lg shadow-lg z-10 min-w-[200px]">
                <div className="p-2">
                  {[
                    { value: 'recent-desc', label: 'Most Recent' },
                    { value: 'name-asc', label: 'Name A-Z' },
                    { value: 'name-desc', label: 'Name Z-A' },
                    { value: 'category-asc', label: 'Category A-Z' },
                    { value: 'rating-desc', label: 'Highest Rated' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortOptionSelect(option.value)}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-[#F3F2F0] transition-colors ${
                        sortOption === option.value ? 'bg-[#F3F2F0] text-[#A85C36]' : 'text-[#332B42]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E0D6D0] rounded-lg text-sm text-[#332B42] hover:bg-[#F3F2F0] transition-colors"
          >
            <ListFilter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {(selectedCategories.length > 0 || sortOption !== 'recent-desc') && (
        <div className="mb-6 flex flex-wrap gap-2">
          {selectedCategories.map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-2 px-3 py-1 bg-[#A85C36] text-white text-sm rounded-full"
            >
              {category}
              <button
                onClick={() => setSelectedCategories(prev => prev.filter(c => c !== category))}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            </span>
          ))}
          {sortOption !== 'recent-desc' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#A85C36] text-white text-sm rounded-full">
              Sort: {sortOption === 'name-asc' ? 'Name A-Z' : sortOption === 'name-desc' ? 'Name Z-A' : sortOption === 'category-asc' ? 'Category A-Z' : 'Highest Rated'}
              <button
                onClick={() => setSortOption('recent-desc')}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {/* Favorites Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <VendorSkeleton key={index} />
          ))}
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {vendorSearch || selectedCategories.length > 0 
              ? 'No favorites match your search criteria'
              : 'No favorites found'
            }
          </div>
          {(vendorSearch || selectedCategories.length > 0) && (
            <button 
              className="btn-primary"
              onClick={() => {
                setVendorSearch('');
                setSelectedCategories([]);
                setSortOption('recent-desc');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFavorites.map((vendor) => (
            <div key={vendor.id} className="w-full">
              <VendorCatalogCard
                vendor={convertVendorToCatalogFormat(vendor)}
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
                category={vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || ''}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 