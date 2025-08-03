import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface UseFavoritesReturn {
  favorites: string[];
  isLoading: boolean;
  toggleFavorite: (placeId: string, vendorData?: any) => Promise<void>;
  syncFavorites: () => Promise<void>;
  loadFavorites: () => Promise<void>;
}

export const useFavorites = (): UseFavoritesReturn => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load favorites from Firestore on mount
  const loadFavorites = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/user-favorites?userId=${user.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        const favoriteIds = data.favorites.map((fav: any) => fav.placeId || fav.id);
        setFavorites(favoriteIds);
        
        // Sync to localStorage for backward compatibility
        localStorage.setItem('vendorFavorites', JSON.stringify(favoriteIds));
        
        console.log('Loaded favorites from Firestore:', favoriteIds);
      } else {
        console.error('Failed to load favorites from Firestore');
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (placeId: string, vendorData?: any) => {
    if (!user?.uid) {
      toast.error('Please log in to manage favorites');
      return;
    }

    const isCurrentlyFavorite = favorites.includes(placeId);
    const newFavoriteState = !isCurrentlyFavorite;

    // Optimistic update
    const newFavorites = newFavoriteState 
      ? [...favorites, placeId]
      : favorites.filter(id => id !== placeId);
    
    setFavorites(newFavorites);
    localStorage.setItem('vendorFavorites', JSON.stringify(newFavorites));

    // Notify other components
    window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
      detail: { favorites: newFavorites }
    }));

    try {
      // Update Firestore
      const response = await fetch('/api/user-favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          placeId,
          vendorData,
          isFavorite: newFavoriteState
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update favorites');
      }

      // Show success message
      if (newFavoriteState) {
        toast.success('Added to favorites!');
      } else {
        toast.success('Removed from favorites');
      }

      // Also update community data for "Favorited by X user" count
      if (vendorData) {
        fetch('/api/community-vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeId,
            vendorName: vendorData.name,
            vendorAddress: vendorData.address || vendorData.location || '',
            vendorCategory: vendorData.category || 'Vendor',
            userId: user.uid,
            selectedAsVenue: false,
            selectedAsVendor: false,
            isFavorite: newFavoriteState
          })
        }).catch(error => {
          console.error('Error updating community favorites:', error);
        });
      }

    } catch (error) {
      console.error('Error toggling favorite:', error);
      
      // Revert optimistic update
      setFavorites(favorites);
      localStorage.setItem('vendorFavorites', JSON.stringify(favorites));
      
      // Notify other components of revert
      window.dispatchEvent(new CustomEvent('vendorFavoritesChanged', {
        detail: { favorites }
      }));
      
      toast.error('Failed to update favorites');
    }
  }, [favorites, user?.uid]);

  // Sync all favorites from localStorage to Firestore
  const syncFavorites = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const localFavorites = JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
      
      const response = await fetch('/api/user-favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          favorites: localFavorites
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Synced favorites:', data);
        setFavorites(localFavorites);
      } else {
        console.error('Failed to sync favorites');
      }
    } catch (error) {
      console.error('Error syncing favorites:', error);
    }
  }, [user?.uid]);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Listen for favorites changes from other components
  useEffect(() => {
    const handleFavoritesChange = (event: CustomEvent) => {
      const newFavorites = event.detail?.favorites || [];
      setFavorites(newFavorites);
    };

    window.addEventListener('vendorFavoritesChanged', handleFavoritesChange as EventListener);
    
    return () => {
      window.removeEventListener('vendorFavoritesChanged', handleFavoritesChange as EventListener);
    };
  }, []);

  return {
    favorites,
    isLoading,
    toggleFavorite,
    syncFavorites,
    loadFavorites
  };
}; 