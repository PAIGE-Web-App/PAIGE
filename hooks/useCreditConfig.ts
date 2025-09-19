/**
 * React hook for credit configuration with Edge Config
 * Provides easy access to credit costs and subscription tiers
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getCoupleAICreditCosts,
  getPlannerAICreditCosts,
  getCoupleSubscriptionCredits,
  getPlannerSubscriptionCredits,
  getCreditCosts,
  getSubscriptionCredits,
  isCreditConfigAvailable
} from '@/lib/creditConfigEdge';
import { 
  type CreditCosts, 
  type CreditAllocation, 
  type UserType,
  type CoupleSubscriptionTier,
  type PlannerSubscriptionTier
} from '@/types/credits';

interface CreditConfigHook {
  // Credit costs
  coupleAICreditCosts: CreditCosts | null;
  plannerAICreditCosts: CreditCosts | null;
  
  // Subscription credits
  coupleSubscriptionCredits: Record<CoupleSubscriptionTier, CreditAllocation> | null;
  plannerSubscriptionCredits: Record<PlannerSubscriptionTier, CreditAllocation> | null;
  
  // Helper functions
  getCreditCosts: (userType: UserType) => Promise<CreditCosts>;
  getSubscriptionCredits: (userType: UserType, tier: string) => Promise<CreditAllocation | null>;
  
  // Status
  isLoading: boolean;
  isEdgeConfigAvailable: boolean;
  error: string | null;
}

export function useCreditConfig(): CreditConfigHook {
  const [coupleAICreditCosts, setCoupleAICreditCosts] = useState<CreditCosts | null>(null);
  const [plannerAICreditCosts, setPlannerAICreditCosts] = useState<CreditCosts | null>(null);
  const [coupleSubscriptionCredits, setCoupleSubscriptionCredits] = useState<Record<CoupleSubscriptionTier, CreditAllocation> | null>(null);
  const [plannerSubscriptionCredits, setPlannerSubscriptionCredits] = useState<Record<PlannerSubscriptionTier, CreditAllocation> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all credit configurations
  const loadCreditConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all configurations in parallel
      const [
        coupleCosts,
        plannerCosts,
        coupleSubs,
        plannerSubs
      ] = await Promise.all([
        getCoupleAICreditCosts(),
        getPlannerAICreditCosts(),
        getCoupleSubscriptionCredits(),
        getPlannerSubscriptionCredits()
      ]);

      setCoupleAICreditCosts(coupleCosts);
      setPlannerAICreditCosts(plannerCosts);
      setCoupleSubscriptionCredits(coupleSubs);
      setPlannerSubscriptionCredits(plannerSubs);
    } catch (err) {
      console.error('Error loading credit configurations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credit configurations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load configurations on mount
  useEffect(() => {
    loadCreditConfigs();
  }, [loadCreditConfigs]);

  // Helper function to get credit costs
  const getCreditCostsForUser = useCallback(async (userType: UserType): Promise<CreditCosts> => {
    return await getCreditCosts(userType);
  }, []);

  // Helper function to get subscription credits
  const getSubscriptionCreditsForUser = useCallback(async (userType: UserType, tier: string): Promise<CreditAllocation | null> => {
    return await getSubscriptionCredits(userType, tier);
  }, []);

  return {
    coupleAICreditCosts,
    plannerAICreditCosts,
    coupleSubscriptionCredits,
    plannerSubscriptionCredits,
    getCreditCosts: getCreditCostsForUser,
    getSubscriptionCredits: getSubscriptionCreditsForUser,
    isLoading,
    isEdgeConfigAvailable: isCreditConfigAvailable(),
    error
  };
}
