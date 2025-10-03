'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { creditServiceClient } from '@/lib/creditServiceClient';
import { creditEventEmitter } from '@/utils/creditEventEmitter';
import {
  UserCredits,
  CreditTransaction,
  AIFeature,
  CreditValidationResult
} from '@/types/credits';
import { logger } from '@/utils/logger';

interface CreditContextType {
  // State
  credits: UserCredits | null;
  loading: boolean;
  error: string | null;
  creditHistory: CreditTransaction[];
  
  // Computed values
  getRemainingCredits: () => number;
  
  // Actions
  loadCredits: () => Promise<void>;
  loadCreditHistory: () => Promise<void>;
  validateCredits: (feature: AIFeature) => Promise<CreditValidationResult>;
  useCredits: (feature: AIFeature, metadata?: Record<string, any>) => Promise<boolean>;
  hasAccessToFeature: (feature: AIFeature) => boolean;
  refreshCredits: () => Promise<void>;
  clearCache: () => void;
  
  // Credit change detection for UI
  getPreviousCredits: () => number;
  setPreviousCredits: (credits: number) => void;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

// Cache for credit data to reduce Firestore reads
const creditCache = {
  data: null as UserCredits | null,
  timestamp: 0,
  duration: 0, // No automatic expiration - only refresh on events
};

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  const [previousCredits, setPreviousCredits] = useState(0);
  
  // Track if we've initialized to prevent duplicate loads
  const initializedRef = useRef(false);
  const eventListenerRef = useRef<(() => void) | null>(null);

  // Load user credits with caching
  const loadCredits = useCallback(async (showLoading = true) => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Only show loading if explicitly requested (not for background polling)
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    // Check cache first (no time-based expiration - only refresh on events)
    if (creditCache.data) {
      setCredits(creditCache.data);
      if (showLoading) {
        setLoading(false);
      }
      return;
    }

    try {
      logger.perf('Loading credits from API', { userId: user.uid });
      const userCredits = await creditServiceClient.getUserCredits(user.uid);
      
      if (userCredits) {
        setCredits(userCredits);
        // Update cache
        creditCache.data = userCredits;
        creditCache.timestamp = new Date().getTime();
      } else {
        // Initialize credits for new user
        try {
          const newCredits = await creditServiceClient.initializeUserCredits(
            user.uid,
            'couple', // Default to couple for now
            'free'    // Default to free tier
          );
          setCredits(newCredits);
          // Update cache
          creditCache.data = newCredits;
          creditCache.timestamp = new Date().getTime();
        } catch (initError) {
          logger.error('Failed to initialize credits', initError);
          setError('Failed to initialize credits');
        }
      }
    } catch (err) {
      logger.error('Error loading credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credits');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [user?.uid]);

  // Load credit history
  const loadCreditHistory = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const history = await creditServiceClient.getCreditHistory(user.uid, 20);
      setCreditHistory(history);
    } catch (err) {
      logger.error('Failed to load credit history:', err);
    }
  }, [user?.uid]);

  // Validate credits for a feature
  const validateCredits = useCallback(async (
    feature: AIFeature
  ): Promise<CreditValidationResult> => {
    if (!user?.uid) {
      return {
        hasEnoughCredits: false,
        requiredCredits: 0,
        currentCredits: 0,
        remainingCredits: 0,
        canProceed: false,
        message: 'User not authenticated'
      };
    }

    try {
      return await creditServiceClient.validateCredits(user.uid, feature);
    } catch (err) {
      logger.error('Error validating credits:', err);
      return {
        hasEnoughCredits: false,
        requiredCredits: 0,
        currentCredits: 0,
        remainingCredits: 0,
        canProceed: false,
        message: 'Error validating credits'
      };
    }
  }, [user?.uid]);

  // Use credits for a feature
  const useCredits = useCallback(async (
    feature: AIFeature,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    if (!user?.uid) return false;

    try {
      const success = await creditServiceClient.deductCredits(user.uid, feature, metadata);
      
      if (success) {
        // Invalidate cache and reload credits
        creditCache.data = null;
        creditCache.timestamp = 0;
        await loadCredits(false); // Don't show loading for credit updates
        await loadCreditHistory();
        
        // Emit credit event for UI updates
        creditEventEmitter.emit();
      }
      
      return success;
    } catch (err) {
      logger.error('Failed to use credits:', err);
      return false;
    }
  }, [user?.uid, loadCredits, loadCreditHistory]);

  // Check if user has access to a feature
  const hasAccessToFeature = useCallback((feature: AIFeature): boolean => {
    if (!credits) return false;
    
    const remainingCredits = (credits.dailyCredits || 0) + (credits.bonusCredits || 0);
    
    // Define credit requirements for each feature
    const creditRequirements: Partial<Record<AIFeature, number>> = {
      'draft_messaging': 1,
      'todo_generation': 2,
      'file_analysis': 3,
      'message_analysis': 2,
      'integrated_planning': 5,
      'budget_generation': 3,
      'vibe_generation': 2,
      'vendor_suggestions': 2,
    };
    
    const requiredCredits = creditRequirements[feature] || 1;
    return remainingCredits >= requiredCredits;
  }, [credits]);

  // Get remaining credits
  const getRemainingCredits = useCallback((): number => {
    if (!credits) return 0;
    return (credits.dailyCredits || 0) + (credits.bonusCredits || 0);
  }, [credits]);

  // Initialize credits on mount
  useEffect(() => {
    if (user?.uid && !initializedRef.current) {
      initializedRef.current = true;
      loadCredits();
    }
  }, [user?.uid, loadCredits]);

  // Set up credit event listener (only once)
  useEffect(() => {
    if (!eventListenerRef.current) {
      const handleCreditEvent = (data?: any) => {
        console.log('🔄 Credit event received:', data);
        // Invalidate cache immediately to force fresh data
        creditCache.data = null;
        creditCache.timestamp = 0;
        // Load credits immediately to get fresh data
        loadCredits(false); // Don't show loading for event-triggered updates
      };

      const unsubscribe = creditEventEmitter.subscribe(handleCreditEvent);
      eventListenerRef.current = unsubscribe;
    }

    return () => {
      if (eventListenerRef.current) {
        eventListenerRef.current();
        eventListenerRef.current = null;
      }
    };
  }, [loadCredits]);

  // Listen for page visibility changes to refresh credits when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.uid) {
        console.log('🔄 Page became visible, refreshing credits...');
        // Invalidate cache and reload
        creditCache.data = null;
        creditCache.timestamp = 0;
        loadCredits(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.uid, loadCredits]);

  // No polling - only refresh on events (webhooks, credit usage, etc.)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (eventListenerRef.current) {
        eventListenerRef.current();
      }
    };
  }, []);

  // Force refresh credits (bypasses cache)
  const refreshCredits = useCallback(async () => {
    if (!user?.uid) return;
    
    // Invalidate cache to force fresh data
    creditCache.data = null;
    creditCache.timestamp = 0;
    
    // Load fresh credits without showing loading screen
    await loadCredits(false);
  }, [user?.uid, loadCredits]);

  const clearCache = useCallback(() => {
    creditCache.data = null;
    creditCache.timestamp = 0;
    console.log('🧹 Credit cache cleared');
  }, []);

  // Expose clearCache globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).clearCreditCache = clearCache;
      (window as any).refreshCredits = refreshCredits;
    }
  }, [clearCache, refreshCredits]);

  const value: CreditContextType = {
    credits,
    loading,
    error,
    creditHistory,
    getRemainingCredits,
    loadCredits,
    loadCreditHistory,
    validateCredits,
    useCredits,
    hasAccessToFeature,
    refreshCredits,
    clearCache,
    getPreviousCredits: () => previousCredits,
    setPreviousCredits,
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
}
