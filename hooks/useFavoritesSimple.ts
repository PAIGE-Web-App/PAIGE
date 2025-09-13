"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';

interface VendorData {
  placeId: string;
  name: string;
  address?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  image?: string;
}

interface UseFavoritesSimpleReturn {
  favorites: VendorData[];
  isLoading: boolean;
  isFavorite: (placeId: string) => boolean;
  toggleFavorite: (vendorData: VendorData) => Promise<void>;
  addFavorite: (vendorData: VendorData) => Promise<void>;
  removeFavorite: (placeId: string) => Promise<void>;
}

export const useFavoritesSimple = (): UseFavoritesSimpleReturn => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [favorites, setFavorites] = useState<VendorData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Initialize client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load favorites from localStorage on mount and when user changes
  useEffect(() => {
    if (!isClient) return;
    
    const loadFavorites = () => {
      try {
        const stored = localStorage.getItem('vendorFavorites');
        if (stored) {
          const parsed = JSON.parse(stored);
          setFavorites(Array.isArray(parsed) ? parsed : []);
        }
      } catch (error) {
        console.error('Error loading favorites from localStorage:', error);
        setFavorites([]);
      }
    };

    loadFavorites();
  }, [isClient, user?.uid]);

  // Listen for storage changes (from other tabs)
  useEffect(() => {
    if (!isClient) return;

    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem('vendorFavorites');
        if (stored) {
          const parsed = JSON.parse(stored);
          setFavorites(Array.isArray(parsed) ? parsed : []);
        }
      } catch (error) {
        console.error('Error handling storage change:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isClient]);

  // Listen for custom events (from same tab)
  useEffect(() => {
    if (!isClient) return;

    const handleCustomEvent = (event: CustomEvent) => {
      if (event.detail?.favorites) {
        setFavorites(event.detail.favorites);
      }
    };

    window.addEventListener('vendorFavoritesChanged', handleCustomEvent as EventListener);
    return () => window.removeEventListener('vendorFavoritesChanged', handleCustomEvent as EventListener);
  }, [isClient]);

  // Check if vendor is favorited
  const isFavorite = useCallback((placeId: string): boolean => {
    return favorites.some(fav => fav.placeId === placeId);
  }, [favorites]);

  // Add favorite
  const addFavorite = useCallback(async (vendorData: VendorData) => {
    if (!isClient) return;

    // Validate vendor data
    if (!vendorData.placeId) {
      console.error('Invalid vendor data: missing placeId');
      showErrorToast('Invalid vendor data');
      return;
    }

    // Ensure we have a name
    const vendorName = vendorData.name || 'Unknown Vendor';

    try {
      const newFavorites = [...favorites, vendorData];
      setFavorites(newFavorites);
      localStorage.setItem('vendorFavorites', JSON.stringify(newFavorites));
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
        detail: { favorites: newFavorites }
      }));

      showSuccessToast(`Added ${vendorName} to favorites!`);

      // Optional: Sync to Firestore in background (non-blocking)
      if (user?.uid) {
        fetch('/api/user-favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            placeId: vendorData.placeId,
            vendorData,
            isFavorite: true
          })
        }).catch(error => {
          console.error('Background sync failed:', error);
        });
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
      showErrorToast('Failed to add to favorites');
    }
  }, [favorites, isClient, user?.uid, showSuccessToast, showErrorToast]);

  // Remove favorite
  const removeFavorite = useCallback(async (placeId: string) => {
    if (!isClient) return;

    try {
      const vendorName = favorites.find(fav => fav.placeId === placeId)?.name || 'vendor';
      const newFavorites = favorites.filter(fav => fav.placeId !== placeId);
      setFavorites(newFavorites);
      localStorage.setItem('vendorFavorites', JSON.stringify(newFavorites));
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
        detail: { favorites: newFavorites }
      }));

      showSuccessToast(`Removed ${vendorName} from favorites`);

      // Optional: Sync to Firestore in background (non-blocking)
      if (user?.uid) {
        fetch('/api/user-favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            placeId,
            isFavorite: false
          })
        }).catch(error => {
          console.error('Background sync failed:', error);
        });
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      showErrorToast('Failed to remove from favorites');
    }
  }, [favorites, isClient, user?.uid, showSuccessToast, showErrorToast]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (vendorData: VendorData) => {
    if (isFavorite(vendorData.placeId)) {
      await removeFavorite(vendorData.placeId);
    } else {
      await addFavorite(vendorData);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite
  };
};
