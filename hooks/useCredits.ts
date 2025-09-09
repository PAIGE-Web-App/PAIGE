import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { creditServiceClient } from '@/lib/creditServiceClient';
import { creditEventEmitter } from '@/utils/creditEventEmitter';
import {
  UserCredits,
  CreditTransaction,
  AIFeature,
  CreditValidationResult
} from '@/types/credits';

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);

           // Load user credits
         const loadCredits = useCallback(async () => {
           if (!user?.uid) {
             setLoading(false);
             return;
           }

           try {
             setLoading(true);
             setError(null);
             
             const userCredits = await creditServiceClient.getUserCredits(user.uid);
             
             if (userCredits) {
               setCredits(userCredits);
             } else {
               // Initialize credits for new user
               const newCredits = await creditServiceClient.initializeUserCredits(
                 user.uid,
                 'couple', // Default to couple for now
                 'free'    // Default to free tier
               );
               setCredits(newCredits);
             }
           } catch (err) {
             console.error('🔄 useCredits: Error loading credits:', err);
             setError(err instanceof Error ? err.message : 'Failed to load credits');
           } finally {
             setLoading(false);
           }
         }, [user?.uid]);

  // Load credit history
  const loadCreditHistory = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const history = await creditServiceClient.getCreditHistory(user.uid, 20);
      setCreditHistory(history);
    } catch (err) {
      console.error('Failed to load credit history:', err);
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
        // Reload credits to get updated count
        await loadCredits();
        await loadCreditHistory();
      }
      
      return success;
    } catch (err) {
      console.error('Failed to use credits:', err);
      return false;
    }
  }, [user?.uid, loadCredits, loadCreditHistory]);

  // Check if user has access to a feature
  const hasFeatureAccess = useCallback(async (
    feature: AIFeature
  ): Promise<boolean> => {
    if (!user?.uid) return false;

    try {
      return await creditServiceClient.hasFeatureAccess(user.uid, feature);
    } catch (err) {
      console.error('Failed to check feature access:', err);
      return false;
    }
  }, [user?.uid]);

  // Add credits (for admin/testing purposes)
  const addCredits = useCallback(async (
    amount: number,
    type: 'purchased' | 'bonus' = 'bonus',
    description?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    if (!user?.uid) return false;

    try {
            const success = await creditServiceClient.addCredits(
        user.uid, 
        amount, 
        type, 
        description, 
        metadata
      );
      
      if (success) {
        await loadCredits();
        await loadCreditHistory();
      }
      
      return success;
    } catch (err) {
      console.error('Failed to add credits:', err);
      return false;
    }
  }, [user?.uid, loadCredits, loadCreditHistory]);

  // Refresh credits manually
  const refreshCredits = useCallback(async () => {
    await loadCredits();
    await loadCreditHistory();
  }, [loadCredits, loadCreditHistory]);

  // Load credits on mount and when user changes
  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  // Load credit history when credits are loaded
  useEffect(() => {
    if (credits) {
      loadCreditHistory();
    }
  }, [credits, loadCreditHistory]);

           // Listen for global credit update events
         useEffect(() => {
           const unsubscribe = creditEventEmitter.subscribe(() => {
             loadCredits();
           });

           return unsubscribe;
         }, [loadCredits]);

  // Get credit usage percentage
  const getCreditUsagePercentage = useCallback(() => {
    if (!credits) return 0;
    
    const subscriptionCredits = credits.userType === 'couple' 
      ? credits.subscriptionTier === 'free' ? 15 
      : credits.subscriptionTier === 'premium' ? 60 
      : 150
      : credits.subscriptionTier === 'free' ? 25
      : credits.subscriptionTier === 'starter' ? 100
      : credits.subscriptionTier === 'professional' ? 300
      : 1000;
    
    const totalAvailable = credits.dailyCredits + credits.bonusCredits;
    const used = subscriptionCredits - totalAvailable;
    return Math.min((used / subscriptionCredits) * 100, 100);
  }, [credits]);

  // Check if credits are low
  const isCreditsLow = useCallback(() => {
    if (!credits) return false;
    const usagePercentage = getCreditUsagePercentage();
    return usagePercentage > 80;
  }, [credits, getCreditUsagePercentage]);

  // Check if credits are exhausted
  const isCreditsExhausted = useCallback(() => {
    if (!credits) return true;
    const totalAvailable = credits.dailyCredits + credits.bonusCredits;
    return totalAvailable <= 0;
  }, [credits]);

  // Get remaining credits
  const getRemainingCredits = useCallback(() => {
    if (!credits) return 0;
    return credits.dailyCredits + credits.bonusCredits;
  }, [credits]);

  // Get subscription tier info
  const getSubscriptionInfo = useCallback(() => {
    if (!credits) return null;
    
    return {
      tier: credits.subscriptionTier,
      userType: credits.userType,
      monthlyCredits: credits.userType === 'couple'
        ? credits.subscriptionTier === 'free' ? 15
        : credits.subscriptionTier === 'premium' ? 60
        : 150
        : credits.subscriptionTier === 'free' ? 25
        : credits.subscriptionTier === 'starter' ? 100
        : credits.subscriptionTier === 'professional' ? 300
        : 1000
    };
  }, [credits]);

  return {
    // State
    credits,
    loading,
    error,
    creditHistory,
    
    // Actions
    loadCredits,
    refreshCredits,
    validateCredits,
    useCredits,
    hasFeatureAccess,
    addCredits,
    
    // Computed values
    getCreditUsagePercentage,
    isCreditsLow,
    isCreditsExhausted,
    getRemainingCredits,
    getSubscriptionInfo,
    
    // Utility
    canUseFeature: (feature: AIFeature) => {
      if (!credits) return false;
      const subscriptionInfo = getSubscriptionInfo();
      if (!subscriptionInfo) return false;
      
      // Check if feature is available for user type and tier
      const availableFeatures = credits.userType === 'couple'
        ? credits.subscriptionTier === 'free' ? ['draft_messaging', 'todo_generation', 'file_analysis', 'budget_generation']
        : credits.subscriptionTier === 'premium' ? ['draft_messaging', 'todo_generation', 'file_analysis', 'message_analysis', 'vibe_generation', 'budget_generation', 'vendor_suggestions']
        : ['draft_messaging', 'todo_generation', 'file_analysis', 'message_analysis', 'integrated_planning', 'budget_generation', 'vibe_generation', 'vendor_suggestions', 'follow_up_questions']
        : credits.subscriptionTier === 'free' ? ['client_communication', 'vendor_coordination']
        : credits.subscriptionTier === 'starter' ? ['client_communication', 'vendor_coordination', 'client_planning', 'vendor_analysis']
        : credits.subscriptionTier === 'professional' ? ['client_communication', 'vendor_coordination', 'client_planning', 'vendor_analysis', 'client_portal_content', 'business_analytics', 'vendor_contract_review']
        : ['client_communication', 'vendor_coordination', 'client_planning', 'vendor_analysis', 'client_portal_content', 'business_analytics', 'client_onboarding', 'vendor_contract_review', 'client_timeline_creation', 'follow_up_questions'];
      
      return availableFeatures.includes(feature);
    }
  };
}
