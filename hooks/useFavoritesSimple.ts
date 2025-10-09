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
  addedAt?: string; // ISO timestamp when added to favorites
}

interface UseFavoritesSimpleReturn {
  favorites: VendorData[];
  isLoading: boolean;
  isFavorite: (placeId: string) => boolean;
  toggleFavorite: (vendorData: VendorData) => Promise<void>;
  addFavorite: (vendorData: VendorData) => Promise<void>;
  removeFavorite: (placeId: string) => Promise<void>;
  batchToggleFavorites: (vendors: VendorData[], isFavoriting: boolean) => Promise<void>;
  syncWithServer: () => Promise<void>;
  clearFavorites: () => Promise<void>;
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

  // Load favorites from Firestore and localStorage on mount and when user changes
  useEffect(() => {
    if (!isClient || !user?.uid) {
      // If no user, load from localStorage only
      if (isClient) {
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
      }
      return;
    }
    
    const loadFavoritesFromFirestore = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/user-favorites?userId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          const firestoreFavorites = data.favorites || [];
          
          // Merge with localStorage favorites (localStorage takes precedence for conflicts)
          const localFavorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
          const mergedFavorites = [...firestoreFavorites];
          
          // Add any local favorites that aren't in Firestore
          localFavorites.forEach((local: VendorData) => {
            if (!mergedFavorites.some((fav: VendorData) => fav.placeId === local.placeId)) {
              mergedFavorites.push(local);
            }
          });
          
          setFavorites(mergedFavorites);
          
          // Update localStorage with merged data
          localStorage.setItem('vendorFavorites', JSON.stringify(mergedFavorites));
        } else {
          // Fallback to localStorage if Firestore fails
          const stored = localStorage.getItem('vendorFavorites');
          if (stored) {
            const parsed = JSON.parse(stored);
            setFavorites(Array.isArray(parsed) ? parsed : []);
          }
        }
      } catch (error) {
        console.error('Error loading favorites from Firestore:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem('vendorFavorites');
        if (stored) {
          const parsed = JSON.parse(stored);
          setFavorites(Array.isArray(parsed) ? parsed : []);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadFavoritesFromFirestore();
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
      const vendorWithTimestamp = {
        ...vendorData,
        addedAt: new Date().toISOString()
      };
      const newFavorites = [...favorites, vendorWithTimestamp];
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
            vendorData: vendorWithTimestamp,
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
    const isCurrentlyFavorited = isFavorite(vendorData.placeId);
    console.log('🔄 Toggle favorite called:', {
      vendorName: vendorData.name,
      placeId: vendorData.placeId,
      isCurrentlyFavorited,
      currentFavorites: favorites.map(f => f.placeId)
    });
    
    if (isCurrentlyFavorited) {
      console.log('🔄 Removing favorite...');
      await removeFavorite(vendorData.placeId);
    } else {
      console.log('🔄 Adding favorite...');
      await addFavorite(vendorData);
    }
  }, [isFavorite, addFavorite, removeFavorite, favorites]);

  // Batch toggle favorites for multiple vendors
  const batchToggleFavorites = useCallback(async (vendors: VendorData[], isFavoriting: boolean) => {
    if (!isClient) return;

    try {
      let newFavorites: VendorData[];
      
      if (isFavoriting) {
        // Add all vendors to favorites
        const existingPlaceIds = new Set(favorites.map(fav => fav.placeId));
        const newVendors = vendors.filter(vendor => !existingPlaceIds.has(vendor.placeId));
        newFavorites = [...favorites, ...newVendors];
      } else {
        // Remove all vendors from favorites
        const placeIdsToRemove = new Set(vendors.map(vendor => vendor.placeId));
        newFavorites = favorites.filter(fav => !placeIdsToRemove.has(fav.placeId));
      }

      setFavorites(newFavorites);
      localStorage.setItem('vendorFavorites', JSON.stringify(newFavorites));
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
        detail: { favorites: newFavorites }
      }));

      const action = isFavoriting ? 'Added' : 'Removed';
      const count = vendors.length;
      showSuccessToast(`${action} ${count} vendor${count > 1 ? 's' : ''} ${isFavoriting ? 'to' : 'from'} favorites`);

      // Background sync to server
      if (user?.uid) {
        const syncPromises = vendors.map(vendor => 
          fetch('/api/user-favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              placeId: vendor.placeId,
              vendorData: vendor,
              isFavorite
            })
          }).catch(error => {
            console.error(`Background sync failed for ${vendor.placeId}:`, error);
          })
        );
        
        Promise.allSettled(syncPromises);
      }
    } catch (error) {
      console.error('Error batch toggling favorites:', error);
      showErrorToast('Failed to update favorites');
    }
  }, [favorites, isClient, user?.uid, showSuccessToast, showErrorToast]);

  // Sync all favorites with server
  const syncWithServer = useCallback(async () => {
    if (!isClient || !user?.uid || favorites.length === 0) return;

    try {
      setIsLoading(true);
      
      const syncPromises = favorites.map(favorite =>
        fetch('/api/user-favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            placeId: favorite.placeId,
            vendorData: favorite,
            isFavorite: true
          })
        })
      );

      const results = await Promise.allSettled(syncPromises);
      const failed = results.filter(result => result.status === 'rejected').length;
      
      if (failed > 0) {
        console.warn(`${failed} favorites failed to sync with server`);
      }
    } catch (error) {
      console.error('Error syncing favorites with server:', error);
    } finally {
      setIsLoading(false);
    }
  }, [favorites, isClient, user?.uid]);

  // Clear all favorites
  const clearFavorites = useCallback(async () => {
    if (!isClient) return;

    try {
      setFavorites([]);
      localStorage.removeItem('vendorFavorites');
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
        detail: { favorites: [] }
      }));

      showSuccessToast('Cleared all favorites');

      // Background sync to server
      if (user?.uid) {
        fetch('/api/user-favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            clearAll: true
          })
        }).catch(error => {
          console.error('Background sync failed:', error);
        });
      }
    } catch (error) {
      console.error('Error clearing favorites:', error);
      showErrorToast('Failed to clear favorites');
    }
  }, [isClient, user?.uid, showSuccessToast, showErrorToast]);

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    batchToggleFavorites,
    syncWithServer,
    clearFavorites
  };
};
