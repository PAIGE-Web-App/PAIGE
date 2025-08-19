"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors } from '@/lib/getContacts';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListFilter, Search, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

import VendorSkeleton from '@/components/VendorSkeleton';
import VendorCatalogCard from '@/components/VendorCatalogCard';
import BadgeCount from '@/components/BadgeCount';
import { 
  convertVendorToCatalogFormat,
  mapGoogleTypesToCategory
} from '@/utils/vendorUtils';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { enhanceVendorsWithImages } from '@/utils/vendorImageUtils';
import { useFavorites } from '@/hooks/useFavorites';

export default function MyFavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { weddingLocation } = useUserProfileData();
  const { favorites, isLoading: favoritesLoading, refreshFavorites } = useFavorites();
  
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

  // Helper to get favorite vendor IDs from localStorage (for backward compatibility)
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
    const updateFavorites = async () => {
      // Update favorites with IDs from hook
      
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
      // Get recently viewed vendors
      
      // Find vendor data in user's vendors list
      const favsFromUserVendors = favorites
        .map((id: string) => vendors.find((v) => v.id === id || v.placeId === id || v.place_id === id))
        .filter(Boolean);
      
      // Find favorites in user vendors
      
      // Find vendor data in recently viewed vendors list
      const favsFromRecentlyViewed = favorites
        .map((id: string) => recentlyViewedVendors.find((v) => v.id === id || v.placeId === id || v.place_id === id))
        .filter(Boolean);
      
      // Find favorites in recently viewed
      
      // Get vendor data from Firestore favorites collection for missing vendors
      const missingFavoriteIds = favorites.filter(id => {
        const foundInUserVendors = favsFromUserVendors.some(v => 
          v.id === id || v.placeId === id || v.place_id === id
        );
        const foundInRecentlyViewed = favsFromRecentlyViewed.some(v => 
          v.id === id || v.placeId === id || v.place_id === id
        );
        return !foundInUserVendors && !foundInRecentlyViewed;
      });
      
      // Find missing vendor data
      
      let favsFromFirestore: any[] = [];
      if (missingFavoriteIds.length > 0 && user?.uid) {
        try {
          const response = await fetch(`/api/user-favorites?userId=${user.uid}`);
          if (response.ok) {
            const data = await response.json();
            // Process Firestore favorites data
            
            favsFromFirestore = data.favorites
              .filter((f: any) => missingFavoriteIds.includes(f.placeId || f.id))
              .map((f: any) => {
                // Try multiple possible field names for each property
                const vendorName = f.name || f.vendorName || f.vendor?.name || 'Unknown Vendor';
                const vendorAddress = f.address || f.vendorAddress || f.vendor?.address || '';
                const vendorCategory = f.category || f.vendorCategory || f.vendor?.category || 'Vendor';
                const vendorRating = f.rating || f.vendor?.rating || 0;
                const vendorReviewCount = f.reviewCount || f.vendor?.reviewCount || f.user_ratings_total || 0;
                const vendorImage = f.image || f.vendor?.image || '';
                
                return {
                  id: f.placeId || f.id,
                  place_id: f.placeId || f.id,
                  name: vendorName,
                  address: vendorAddress,
                  rating: vendorRating,
                  user_ratings_total: vendorReviewCount,
                  image: vendorImage,
                  mainTypeLabel: vendorCategory
                };
              });
            
            // For favorites without vendor data, try to fetch from Google Places API
            const incompleteFavorites = favsFromFirestore.filter(f => f.name === 'Unknown Vendor');
            if (incompleteFavorites.length > 0) {
              try {
                const placeDetailsPromises = incompleteFavorites.map(async (favorite) => {
                  try {
                    const response = await fetch(`/api/google-place-details?placeId=${favorite.place_id}`);
                    if (response.ok) {
                      const placeData = await response.json();
                      
                      if (placeData.result) {
                        // Get the best available image
                        let bestImage = favorite.image;
                        if (placeData.result.photos && placeData.result.photos.length > 0) {
                          const photo = placeData.result.photos[0];
                          bestImage = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
                        }
                        
                        return {
                          ...favorite,
                          name: placeData.result.name || favorite.name,
                          address: placeData.result.formatted_address || favorite.address,
                          rating: placeData.result.rating || favorite.rating,
                          user_ratings_total: placeData.result.user_ratings_total || favorite.user_ratings_total,
                          image: bestImage
                        };
                      }
                    }
                  } catch (error) {
                    console.error('Error fetching place details for', favorite.place_id, ':', error);
                  }
                  return favorite;
                });
                
                const enhancedFavorites = await Promise.all(placeDetailsPromises);
                
                // Replace incomplete favorites with enhanced ones
                favsFromFirestore = favsFromFirestore.map(f => {
                  const enhanced = enhancedFavorites.find(ef => ef.place_id === f.place_id);
                  return enhanced || f;
                });
              } catch (error) {
                console.error('Error enhancing incomplete favorites:', error);
              }
            }
            // Processed favorites from Firestore
          }
        } catch (error) {
          console.error('Error fetching favorites from Firestore:', error);
        }
      }
      
      // Create a map to track unique vendors by placeId (preferred) or id
      const uniqueVendorsMap = new Map();
      
      // Add vendors from user's list first (these are more complete)
      favsFromUserVendors.forEach(vendor => {
        const key = vendor.placeId || vendor.place_id || vendor.id;
        if (key && !uniqueVendorsMap.has(key)) {
          uniqueVendorsMap.set(key, vendor);
        }
      });
      
      // Add vendors from recently viewed only if not already present
      favsFromRecentlyViewed.forEach(vendor => {
        const key = vendor.placeId || vendor.place_id || vendor.id;
        if (key && !uniqueVendorsMap.has(key)) {
          uniqueVendorsMap.set(key, vendor);
        }
      });
      
      // Add vendors from Firestore favorites collection, but merge with existing data
      favsFromFirestore.forEach(vendor => {
        const key = vendor.placeId || vendor.place_id || vendor.id;
        if (key) {
          if (!uniqueVendorsMap.has(key)) {
            // If no existing vendor, add this one
            uniqueVendorsMap.set(key, vendor);
          } else {
            // If vendor exists, merge data intelligently (preserve better data)
            const existingVendor = uniqueVendorsMap.get(key);
            const mergedVendor = {
              ...existingVendor,
              // Only use Firestore data if it's better (not empty/0)
              name: vendor.name !== 'Unknown Vendor' ? vendor.name : existingVendor.name,
              address: vendor.address || existingVendor.address,
              rating: vendor.rating > 0 ? vendor.rating : existingVendor.rating,
              user_ratings_total: vendor.user_ratings_total > 0 ? vendor.user_ratings_total : existingVendor.user_ratings_total,
              image: vendor.image || existingVendor.image,
              mainTypeLabel: vendor.mainTypeLabel || existingVendor.mainTypeLabel
            };
            uniqueVendorsMap.set(key, mergedVendor);
          }
        }
      });
      
      const allFavs = Array.from(uniqueVendorsMap.values());
      
      // Check for potential duplicates
      const placeIds = allFavs.map(v => v.placeId || v.place_id).filter(Boolean);
      const ids = allFavs.map(v => v.id).filter(Boolean);
      
      if (placeIds.length !== new Set(placeIds).size) {
        console.warn('⚠️ Duplicate placeIds found:', placeIds);
      }
      if (ids.length !== new Set(ids).size) {
        console.warn('⚠️ Duplicate IDs found:', ids);
      }
      
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
  }, [vendors, favorites, user?.uid]);

  // Enhance favorite vendors with unified image handling
  useEffect(() => {
    const enhanceFavorites = async () => {
      if (favoriteVendors.length === 0) {
        setEnhancedFavoriteVendors([]);
        return;
      }

      try {
        // Enhance vendors with images
        
        const enhanced = await enhanceVendorsWithImages(favoriteVendors);
        setEnhancedFavoriteVendors(enhanced);
        // Enhanced vendors with images
      } catch (error) {
        console.error('Error enhancing favorite vendors with images:', error);
        setEnhancedFavoriteVendors(favoriteVendors);
      }
    };

    enhanceFavorites();
  }, [favoriteVendors]);

  // Check if sync is needed
  const localFavorites = getFavoriteVendorIds();
  const needsSync = localFavorites.length > 0 && favorites.length === 0 && !favoritesLoading;

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
        // Loaded vendors from Firestore
        
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
          if (vendor.category && favorites.includes(vendor.id)) {
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

  // Get unique categories from all favorite vendors, sorted alphabetically
  const categories = useMemo(() => {
    const allCategories = new Set<string>();
    
    // Add categories from user vendors
    vendors.forEach(vendor => {
      if (vendor.category && !isFirestoreDocumentId(vendor.category)) {
        allCategories.add(vendor.category);
      }
    });
    
    // Add categories from favorite vendors (including those from Google Places)
    favoriteVendors.forEach(vendor => {
      if (vendor.category && !isFirestoreDocumentId(vendor.category)) {
        allCategories.add(vendor.category);
      }
      if (vendor.mainTypeLabel && !isFirestoreDocumentId(vendor.mainTypeLabel)) {
        allCategories.add(vendor.mainTypeLabel);
      }
    });
    
    // Add categories from enhanced favorite vendors
    enhancedFavoriteVendors.forEach(vendor => {
      if (vendor.category && !isFirestoreDocumentId(vendor.category)) {
        allCategories.add(vendor.category);
      }
      if (vendor.mainTypeLabel && !isFirestoreDocumentId(vendor.mainTypeLabel)) {
        allCategories.add(vendor.mainTypeLabel);
      }
    });
    
    // Fallback to common vendor categories if none found
    if (allCategories.size === 0) {
      ['Venue', 'Photographer', 'Caterer', 'Florist', 'DJ', 'Band', 'Wedding Planner', 'Beauty', 'Transportation'].forEach(cat => {
        allCategories.add(cat);
      });
    }
    
    const result = Array.from(allCategories).sort((a, b) => a.localeCompare(b));
    console.log('🔍 Categories found:', {
      vendorsCount: vendors.length,
      favoriteVendorsCount: favoriteVendors.length,
      enhancedFavoriteVendorsCount: enhancedFavoriteVendors.length,
      categories: result
    });
    
    return result;
  }, [vendors, favoriteVendors, enhancedFavoriteVendors]);

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
    <div className="max-w-6xl mx-auto w-full bg-[#F3F2F0]">
      {/* Breadcrumb */}
      <div className="px-6 pt-6 pb-2">
        <button
          onClick={() => router.push('/vendors')}
          className="text-sm text-[#A85C36] hover:text-[#332B42] transition-colors"
        >
          ← Back to Vendor Hub
        </button>
      </div>

      {/* Header */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="h5">
              My Favorites
            </h1>
            <BadgeCount count={favorites.length} />
          </div>
          <button
            onClick={() => router.push('/vendors/catalog')}
            className="btn-primary"
          >
            Add Vendor
          </button>
        </div>
      </div>

      {/* Sync Banner */}
      {needsSync && (
        <div className="mb-6 bg-yellow-50 border border-yellow-300 border-l-4 border-l-yellow-400 p-4 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Sync Your Favorites
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  We found {localFavorites.length} favorite(s) in your browser that haven't been synced to your account. 
                  Click the button below to sync them and access them across all your devices.
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={refreshFavorites}
                  className="bg-yellow-600 text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Sync Favorites
                </button>
                <a
                  href="/fix-favorites"
                  target="_blank"
                  className="text-yellow-700 bg-yellow-100 px-4 py-2 text-sm font-medium rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Need Help?
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="px-6 mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
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
              <div className="absolute top-full right-0 mt-1 bg-white border border-[#E0D6D0] rounded-lg shadow-xl z-[9999] min-w-[200px]">
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
          <div className="relative filter-menu">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E0D6D0] rounded-lg text-sm text-[#332B42] hover:bg-[#F3F2F0] transition-colors"
            >
              <ListFilter className="w-4 h-4" />
              Filter
            </button>
            
            {showFilterMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-[#E0D6D0] rounded-lg shadow-xl z-[9999] min-w-[200px]">
                <div className="p-2">
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategories(prev => 
                            prev.includes(category) 
                              ? prev.filter(c => c !== category)
                              : [...prev, category]
                          );
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-[#F3F2F0] transition-colors ${
                          selectedCategories.includes(category) ? 'bg-[#F3F2F0] text-[#A85C36]' : 'text-[#332B42]'
                        }`}
                      >
                        {category}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No categories available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {(selectedCategories.length > 0 || sortOption !== 'recent-desc') && (
        <div className="px-6 mb-6 flex flex-wrap gap-2">
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
        <div className="px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <VendorSkeleton key={index} />
            ))}
          </div>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="px-6">
          <div className="text-center py-12">
            {/* Empty State Icon */}
            <div className="flex justify-center mb-4">
              <svg 
                width="64" 
                height="64" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5"
                className="text-gray-400"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            
            <div className="text-gray-500 mb-6">
              {vendorSearch || selectedCategories.length > 0 
                ? 'No favorites match your search criteria'
                : 'No favorites found'
              }
            </div>
            
            {(vendorSearch || selectedCategories.length > 0) && (
              <div className="flex justify-center">
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
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFavorites.map((vendor) => {
              const convertedVendor = convertVendorToCatalogFormat(vendor);
              console.log('🔍 Vendor data for', vendor.name, ':', {
                original: { rating: vendor.rating, user_ratings_total: vendor.user_ratings_total },
                converted: { rating: convertedVendor.rating, reviewCount: convertedVendor.reviewCount }
              });
              
              return (
                <div key={vendor.id} className="w-full">
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
                    category={vendor.types && vendor.types.length > 0 ? mapGoogleTypesToCategory(vendor.types, vendor.name) : vendor.category || ''}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 