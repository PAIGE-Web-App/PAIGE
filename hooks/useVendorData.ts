// hooks/useVendorData.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors } from '@/lib/getContacts';
import { getRecentlyViewedVendors, convertVendorToCatalogFormat } from '@/utils/vendorUtils';

interface UseVendorDataReturn {
  vendors: any[];
  recentlyViewedVendors: any[];
  favoriteVendors: any[];
  isLoading: boolean;
  error: string | null;
  refreshVendors: () => Promise<void>;
  refreshRecentlyViewed: () => void;
  refreshFavorites: () => void;
}

export const useVendorData = (): UseVendorDataReturn => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<any[]>([]);
  const [recentlyViewedVendors, setRecentlyViewedVendors] = useState<any[]>([]);
  const [favoriteVendors, setFavoriteVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to get favorite vendor IDs from localStorage
  const getFavoriteVendorIds = useCallback(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
    } catch {
      return [];
    }
  }, []);

  // Load vendors from Firestore
  const loadVendors = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllVendors(user.uid);
      setVendors(data);
    } catch (err) {
      console.error('Error loading vendors:', err);
      setError('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Load recently viewed vendors
  const loadRecentlyViewed = useCallback(() => {
    const recent = getRecentlyViewedVendors();
    setRecentlyViewedVendors(recent);
  }, []);

  // Update favorite vendors
  const updateFavorites = useCallback(() => {
    const favIds = getFavoriteVendorIds();
    // Find vendor data in user's vendors list
    const favs = favIds
      .map((id: string) => vendors.find((v) => v.id === id || v.placeId === id))
      .filter(Boolean);
    setFavoriteVendors(favs);
  }, [vendors, getFavoriteVendorIds]);

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
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [updateFavorites]);

  // Refresh functions
  const refreshVendors = useCallback(async () => {
    await loadVendors();
  }, [loadVendors]);

  const refreshRecentlyViewed = useCallback(() => {
    loadRecentlyViewed();
  }, [loadRecentlyViewed]);

  const refreshFavorites = useCallback(() => {
    updateFavorites();
  }, [updateFavorites]);

  return {
    vendors,
    recentlyViewedVendors,
    favoriteVendors,
    isLoading,
    error,
    refreshVendors,
    refreshRecentlyViewed,
    refreshFavorites
  };
}; 