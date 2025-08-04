// hooks/useVendorDataOptimized.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors } from '@/lib/getContacts';
import { getRecentlyViewedVendors, convertVendorToCatalogFormat } from '@/utils/vendorUtils';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

interface UseVendorDataReturn {
  vendors: any[];
  recentlyViewedVendors: any[];
  favoriteVendors: any[];
  isLoading: boolean;
  error: string | null;
  refreshVendors: () => Promise<void>;
  refreshRecentlyViewed: () => void;
  refreshFavorites: () => void;
  // Optimized computed values
  vendorsByCategory: Record<string, any[]>;
  vendorCategories: string[];
  totalVendors: number;
}

// Memoized vendor data transformation
const transformVendorData = (vendor: any) => {
  return {
    ...vendor,
    // Ensure consistent data structure
    id: vendor.id || vendor.placeId,
    placeId: vendor.placeId || vendor.id,
    name: vendor.name || vendor.businessName || 'Unknown Vendor',
    category: vendor.category || vendor.type || 'Other',
    addedAt: vendor.addedAt ? new Date(vendor.addedAt) : new Date(),
    orderIndex: vendor.orderIndex || 0,
  };
};

// Memoized sorting function
const sortVendors = (vendors: any[]) => {
  return vendors.sort((a, b) => {
    // Use orderIndex if available (negative timestamp for recent first)
    if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
      return a.orderIndex - b.orderIndex;
    }
    
    // Fallback to addedAt timestamp
    const aTime = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const bTime = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return bTime - aTime; // Most recent first
  });
};

export const useVendorDataOptimized = (): UseVendorDataReturn => {
  const { user } = useAuth();
  const { trackApiCall } = usePerformanceMonitor('VendorData');
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [recentlyViewedVendors, setRecentlyViewedVendors] = useState<any[]>([]);
  const [favoriteVendors, setFavoriteVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized helper to get favorite vendor IDs from localStorage
  const getFavoriteVendorIds = useCallback(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
    } catch {
      return [];
    }
  }, []);

  // Memoized vendors by category
  const vendorsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    vendors.forEach(vendor => {
      const category = vendor.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(vendor);
    });
    
    // Sort vendors within each category
    Object.keys(grouped).forEach(category => {
      grouped[category] = sortVendors(grouped[category]);
    });
    
    return grouped;
  }, [vendors]);

  // Memoized vendor categories
  const vendorCategories = useMemo(() => {
    return Object.keys(vendorsByCategory).sort();
  }, [vendorsByCategory]);

  // Memoized total vendors count
  const totalVendors = useMemo(() => {
    return vendors.length;
  }, [vendors]);

  // Optimized load vendors from Firestore
  const loadVendors = useCallback(async () => {
    if (!user?.uid) return;
    
    const startTime = performance.now();
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getAllVendors(user.uid);
      
      // Transform and sort data
      const transformedData = data.map(transformVendorData);
      const sortedData = sortVendors(transformedData);
      
      setVendors(sortedData);
      trackApiCall('/api/getAllVendors', performance.now() - startTime, true);
    } catch (err) {
      console.error('Error loading vendors:', err);
      setError('Failed to load vendors');
      trackApiCall('/api/getAllVendors', performance.now() - startTime, false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, trackApiCall]);

  // Optimized load recently viewed vendors
  const loadRecentlyViewed = useCallback(() => {
    const startTime = performance.now();
    try {
      const recent = getRecentlyViewedVendors();
      setRecentlyViewedVendors(recent);
      trackApiCall('/api/getRecentlyViewedVendors', performance.now() - startTime, true);
    } catch (error) {
      console.error('Error loading recently viewed vendors:', error);
      trackApiCall('/api/getRecentlyViewedVendors', performance.now() - startTime, false);
    }
  }, [trackApiCall]);

  // Memoized update favorite vendors
  const updateFavorites = useCallback(() => {
    const startTime = performance.now();
    try {
      const favIds = getFavoriteVendorIds();
      // Find vendor data in user's vendors list
      const favs = favIds
        .map((id: string) => vendors.find((v) => v.id === id || v.placeId === id))
        .filter(Boolean);
      setFavoriteVendors(favs);
      trackApiCall('/api/updateFavorites', performance.now() - startTime, true);
    } catch (error) {
      console.error('Error updating favorites:', error);
      trackApiCall('/api/updateFavorites', performance.now() - startTime, false);
    }
  }, [vendors, getFavoriteVendorIds, trackApiCall]);

  // Memoized refresh functions
  const refreshVendors = useCallback(async () => {
    await loadVendors();
  }, [loadVendors]);

  const refreshRecentlyViewed = useCallback(() => {
    loadRecentlyViewed();
  }, [loadRecentlyViewed]);

  const refreshFavorites = useCallback(() => {
    updateFavorites();
  }, [updateFavorites]);

  // Initial load
  useEffect(() => {
    loadVendors();
    loadRecentlyViewed();
  }, [loadVendors, loadRecentlyViewed]);

  // Update favorites when vendors change
  useEffect(() => {
    updateFavorites();
  }, [vendors, updateFavorites]);

  // Listen for storage changes (favorites updates)
  useEffect(() => {
    const handleStorageChange = () => {
      updateFavorites();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    const handleCustomStorageChange = () => {
      updateFavorites();
    };
    
    window.addEventListener('vendorFavoritesUpdated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('vendorFavoritesUpdated', handleCustomStorageChange);
    };
  }, [updateFavorites]);

  return {
    vendors,
    recentlyViewedVendors,
    favoriteVendors,
    isLoading,
    error,
    refreshVendors,
    refreshRecentlyViewed,
    refreshFavorites,
    // Optimized computed values
    vendorsByCategory,
    vendorCategories,
    totalVendors,
  };
}; 