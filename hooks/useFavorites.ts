// hooks/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';

interface UseFavoritesReturn {
  favorites: string[];
  isLoading: boolean;
  error: string | null;
  addFavorite: (placeId: string, vendorData?: any) => Promise<void>;
  removeFavorite: (placeId: string) => Promise<void>;
  toggleFavorite: (placeId: string, vendorData?: any) => Promise<void>;
  refreshFavorites: () => Promise<void>;
  isFavorite: (placeId: string) => boolean;
}

export const useFavorites = (): UseFavoritesReturn => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Helper to get favorites from localStorage
  const getLocalFavorites = useCallback(() => {
    if (!isClient || typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
    } catch {
      return [];
    }
  }, [isClient]);

  // Helper to set favorites in localStorage
  const setLocalFavorites = useCallback((favs: string[]) => {
    if (!isClient || typeof localStorage === 'undefined') return;
    localStorage.setItem('vendorFavorites', JSON.stringify(favs));
  }, [isClient]);

  // Load favorites from Firestore and merge with localStorage
  const loadFavoritesFromFirestore = useCallback(async () => {
    if (!user?.uid || !isClient) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/user-favorites?userId=${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        const firestoreFavorites = data.favorites?.map((f: any) => f.placeId || f.id) || [];
        
        // Get current localStorage favorites
        const localFavorites = getLocalFavorites();
        
        // Merge Firestore favorites with localStorage
        const allFavoriteIds = new Set([...localFavorites, ...firestoreFavorites]);
        const mergedFavorites = Array.from(allFavoriteIds);
        
        // Update localStorage with merged favorites
        setLocalFavorites(mergedFavorites);
        
        // Update state
        setFavorites(mergedFavorites);
        
        console.log('✅ Loaded favorites from Firestore and merged with localStorage:', mergedFavorites);
      } else {
        throw new Error('Failed to load favorites from Firestore');
      }
    } catch (err) {
      console.error('Error loading favorites from Firestore:', err);
      setError('Failed to load favorites');
      
      // Fallback to localStorage only
      const localFavorites = getLocalFavorites();
      setFavorites(localFavorites);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isClient, getLocalFavorites, setLocalFavorites]);

  // Sync favorites to Firestore
  const syncFavoritesToFirestore = useCallback(async (favs: string[]) => {
    if (!user?.uid || !isClient) return;
    
    try {
      const response = await fetch('/api/user-favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          favorites: favs
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync favorites to Firestore');
      }
      
      console.log('✅ Synced favorites to Firestore');
    } catch (err) {
      console.error('Error syncing favorites to Firestore:', err);
      throw err;
    }
  }, [user?.uid, isClient]);

  // Add a favorite
  const addFavorite = useCallback(async (placeId: string, vendorData?: any) => {
    if (!user?.uid || !isClient) return;
    
    try {
      const currentFavorites = getLocalFavorites();
      if (currentFavorites.includes(placeId)) {
        return; // Already favorited
      }
      
      const newFavorites = [...currentFavorites, placeId];
      
      // Update localStorage immediately (optimistic update)
      setLocalFavorites(newFavorites);
      setFavorites(newFavorites);
      
      // Update community data
      if (vendorData) {
        fetch('/api/community-vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeId,
            vendorName: vendorData.name,
            vendorAddress: vendorData.address,
            vendorCategory: vendorData.category,
            userId: user.uid,
            selectedAsVenue: false,
            selectedAsVendor: false,
            isFavorite: true
          })
        }).catch(console.error);
      }
      
      // Sync to Firestore
      await syncFavoritesToFirestore(newFavorites);
      
      // Notify other components
      if (isClient) {
        window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
          detail: { favorites: newFavorites }
        }));
      }
      
      showSuccessToast(`Added ${vendorData?.name || 'vendor'} to favorites!`);
    } catch (err) {
      console.error('Error adding favorite:', err);
      showErrorToast('Failed to add to favorites');
      
      // Revert optimistic update
      const currentFavorites = getLocalFavorites();
      setFavorites(currentFavorites);
    }
  }, [user?.uid, isClient, getLocalFavorites, setLocalFavorites, syncFavoritesToFirestore, showSuccessToast, showErrorToast]);

  // Remove a favorite
  const removeFavorite = useCallback(async (placeId: string) => {
    if (!user?.uid || !isClient) return;
    
    try {
      const currentFavorites = getLocalFavorites();
      if (!currentFavorites.includes(placeId)) {
        return; // Not favorited
      }
      
      const newFavorites = currentFavorites.filter(id => id !== placeId);
      
      // Update localStorage immediately (optimistic update)
      setLocalFavorites(newFavorites);
      setFavorites(newFavorites);
      
      // Update community data
      fetch('/api/community-vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          vendorName: '',
          vendorAddress: '',
          vendorCategory: '',
          userId: user.uid,
          selectedAsVenue: false,
          selectedAsVendor: false,
          isFavorite: false
        })
      }).catch(console.error);
      
      // Sync to Firestore
      await syncFavoritesToFirestore(newFavorites);
      
      // Notify other components
      if (isClient) {
        window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
          detail: { favorites: newFavorites }
        }));
      }
      
      showSuccessToast('Removed from favorites');
    } catch (err) {
      console.error('Error removing favorite:', err);
      showErrorToast('Failed to remove from favorites');
      
      // Revert optimistic update
      const currentFavorites = getLocalFavorites();
      setFavorites(currentFavorites);
    }
  }, [user?.uid, isClient, getLocalFavorites, setLocalFavorites, syncFavoritesToFirestore, showSuccessToast, showErrorToast]);

  // Toggle favorite state
  const toggleFavorite = useCallback(async (placeId: string, vendorData?: any) => {
    const isCurrentlyFavorite = favorites.includes(placeId);
    
    if (isCurrentlyFavorite) {
      await removeFavorite(placeId);
    } else {
      await addFavorite(placeId, vendorData);
    }
  }, [favorites, addFavorite, removeFavorite]);

  // Refresh favorites from Firestore
  const refreshFavorites = useCallback(async () => {
    await loadFavoritesFromFirestore();
  }, [loadFavoritesFromFirestore]);

  // Check if a vendor is favorited
  const isFavorite = useCallback((placeId: string) => {
    return favorites.includes(placeId);
  }, [favorites]);

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize favorites when user changes
  useEffect(() => {
    if (user?.uid && isClient) {
      loadFavoritesFromFirestore();
    } else if (!user?.uid) {
      setFavorites([]);
    }
  }, [user?.uid, isClient, loadFavoritesFromFirestore]);

  // Listen for storage changes (from other tabs)
  useEffect(() => {
    if (!isClient) return;
    
    const handleStorageChange = () => {
      const localFavorites = getLocalFavorites();
      setFavorites(localFavorites);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isClient, getLocalFavorites]);

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

  return {
    favorites,
    isLoading,
    error,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    refreshFavorites,
    isFavorite
  };
}; 