import { useEffect, useState, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

interface VendorsPageData {
  // User profile data
  weddingLocation: string | null;
  selectedVenueMetadata: any | null;
  selectedVendors: { [key: string]: any[] };
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

export function useVendorsPageData(): VendorsPageData {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Single state for all user data
  const [userData, setUserData] = useState<{
    weddingLocation: string | null;
    selectedVenueMetadata: any | null;
    selectedVendors: { [key: string]: any[] };
  }>({
    weddingLocation: null,
    selectedVenueMetadata: null,
    selectedVendors: {}
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Single Firestore read for all user data
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          setUserData({
            weddingLocation: null,
            selectedVenueMetadata: null,
            selectedVendors: {}
          });
          return;
        }
        
        const data = userDoc.data();
        
        // Extract only the data we need for vendors page
        setUserData({
          weddingLocation: data.weddingLocation || null,
          selectedVenueMetadata: data.selectedVenueMetadata || null,
          selectedVendors: data.selectedVendors || {}
        });
        
      } catch (err) {
        console.error('Error fetching user data for vendors page:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user?.uid]);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    weddingLocation: userData.weddingLocation,
    selectedVenueMetadata: userData.selectedVenueMetadata,
    selectedVendors: userData.selectedVendors,
    isLoading: isLoading || authLoading,
    error
  }), [userData, isLoading, authLoading, error]);
}
