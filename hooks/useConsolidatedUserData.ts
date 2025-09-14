/**
 * Consolidated User Data Hook
 * Reduces Firestore reads by fetching all user data in a single query
 * with intelligent caching and selective field loading
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface ConsolidatedUserData {
  // Basic profile data
  userName: string | null;
  partnerName: string | null;
  partnerEmail: string | null;
  plannerName: string | null;
  plannerEmail: string | null;
  
  // Wedding details
  guestCount: number | null;
  budget: number | null;
  cityState: string | null;
  style: string | null;
  weddingLocation: string | null;
  weddingLocationUndecided: boolean;
  hasVenue: boolean | null;
  
  // Selected vendors
  selectedVenueMetadata: any | null;
  selectedPlannerMetadata: any | null;
  selectedVendors: { [key: string]: any[] };
  
  // Preferences
  vibe: string[];
  vibeInputMethod: string;
  generatedVibes: string[];
  maxBudget: number | null;
  
  // Notification preferences
  phoneNumber: string | null;
  notificationPreferences: {
    sms: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

interface UseConsolidatedUserDataOptions {
  cacheTTL?: number; // Cache time-to-live in milliseconds
  enableCache?: boolean;
  selectiveFields?: string[]; // Only fetch specific fields
}

const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'consolidated_user_data';

class UserDataCache {
  private static instance: UserDataCache;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static getInstance(): UserDataCache {
    if (!UserDataCache.instance) {
      UserDataCache.instance = new UserDataCache();
    }
    return UserDataCache.instance;
  }

  get(key: string, ttl: number): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  }

  set(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export function useConsolidatedUserData(options: UseConsolidatedUserDataOptions = {}): ConsolidatedUserData {
  const { user, loading: authLoading } = useAuth();
  const { cacheTTL = DEFAULT_CACHE_TTL, enableCache = true, selectiveFields } = options;
  
  const [userData, setUserData] = useState<ConsolidatedUserData>({
    userName: null,
    partnerName: null,
    partnerEmail: null,
    plannerName: null,
    plannerEmail: null,
    guestCount: null,
    budget: null,
    cityState: null,
    style: null,
    weddingLocation: null,
    weddingLocationUndecided: false,
    hasVenue: null,
    selectedVenueMetadata: null,
    selectedPlannerMetadata: null,
    selectedVendors: {},
    vibe: [],
    vibeInputMethod: 'pills',
    generatedVibes: [],
    maxBudget: null,
    phoneNumber: null,
    notificationPreferences: {
      sms: false,
      email: false,
      push: false,
      inApp: false
    },
    isLoading: true,
    error: null,
    lastUpdated: 0
  });

  const cache = useMemo(() => UserDataCache.getInstance(), []);

  const fetchUserData = useCallback(async (forceRefresh = false) => {
    if (!user?.uid || authLoading) {
      setUserData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Check cache first
    if (enableCache && !forceRefresh) {
      const cached = cache.get(CACHE_KEY, cacheTTL);
      if (cached) {
        setUserData(prev => ({ ...prev, ...cached, isLoading: false }));
        return;
      }
    }

    try {
      setUserData(prev => ({ ...prev, isLoading: true, error: null }));

      // Single Firestore read for all user data
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setUserData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const data = userDoc.data();
      const now = Date.now();

      // Extract only the fields we need
      const consolidatedData: Partial<ConsolidatedUserData> = {
        userName: data.userName || null,
        partnerName: data.partnerName || null,
        partnerEmail: data.partnerEmail || null,
        plannerName: data.plannerName || null,
        plannerEmail: data.plannerEmail || null,
        guestCount: data.guestCount || null,
        budget: data.budget || null,
        cityState: data.cityState || null,
        style: data.style || null,
        weddingLocation: data.weddingLocation || null,
        weddingLocationUndecided: data.weddingLocationUndecided || false,
        hasVenue: data.hasVenue || null,
        selectedVenueMetadata: data.selectedVenueMetadata || null,
        selectedPlannerMetadata: data.selectedPlannerMetadata || null,
        selectedVendors: data.selectedVendors || {},
        vibe: data.vibe || [],
        vibeInputMethod: data.vibeInputMethod || 'pills',
        generatedVibes: data.generatedVibes || [],
        maxBudget: data.maxBudget || null,
        phoneNumber: data.phoneNumber || null,
        notificationPreferences: {
          sms: data.notificationPreferences?.sms || false,
          email: data.notificationPreferences?.email || false,
          push: data.notificationPreferences?.push || false,
          inApp: data.notificationPreferences?.inApp || false
        },
        lastUpdated: now
      };

      // Cache the data
      if (enableCache) {
        cache.set(CACHE_KEY, consolidatedData, cacheTTL);
      }

      setUserData(prev => ({ ...prev, ...consolidatedData, isLoading: false }));

    } catch (error) {
      console.error('Error fetching consolidated user data:', error);
      setUserData(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load user data' 
      }));
    }
  }, [user?.uid, authLoading, enableCache, cacheTTL, cache]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    fetchUserData(true);
  }, [fetchUserData]);

  // Clear cache function
  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  return {
    ...userData,
    refresh,
    clearCache
  };
}

// Export cache instance for debugging
export const userDataCache = UserDataCache.getInstance();
