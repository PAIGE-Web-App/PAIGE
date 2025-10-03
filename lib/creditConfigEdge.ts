/**
 * Credit Configuration Edge Config Service
 * Safely manages credit costs and subscription tiers in Edge Config with fallback
 */

import { getEdgeConfig, putEdgeConfig, isEdgeConfigAvailable } from './edgeConfig';
import { 
  COUPLE_AI_CREDIT_COSTS, 
  PLANNER_AI_CREDIT_COSTS,
  COUPLE_SUBSCRIPTION_CREDITS,
  PLANNER_SUBSCRIPTION_CREDITS,
  type CreditCosts,
  type CreditAllocation,
  type CoupleSubscriptionTier,
  type PlannerSubscriptionTier,
  type UserType
} from '../types/credits';

// Default credit costs (fallback data)
const DEFAULT_COUPLE_AI_CREDIT_COSTS: CreditCosts = COUPLE_AI_CREDIT_COSTS;
const DEFAULT_PLANNER_AI_CREDIT_COSTS: CreditCosts = PLANNER_AI_CREDIT_COSTS;

// Default subscription credits (fallback data)
const DEFAULT_COUPLE_SUBSCRIPTION_CREDITS = COUPLE_SUBSCRIPTION_CREDITS;
const DEFAULT_PLANNER_SUBSCRIPTION_CREDITS = PLANNER_SUBSCRIPTION_CREDITS;

/**
 * Get couple AI credit costs from Edge Config with fallback
 */
export async function getCoupleAICreditCosts(): Promise<CreditCosts> {
  try {
    const costs = await getEdgeConfig('coupleAICreditCosts', DEFAULT_COUPLE_AI_CREDIT_COSTS);
    
    // Validate the data structure
    if (costs && typeof costs === 'object') {
      return costs as CreditCosts;
    }
    
    console.warn('Invalid couple AI credit costs from Edge Config, using fallback');
    return DEFAULT_COUPLE_AI_CREDIT_COSTS;
  } catch (error) {
    console.error('Error getting couple AI credit costs from Edge Config:', error);
    return DEFAULT_COUPLE_AI_CREDIT_COSTS;
  }
}

/**
 * Get planner AI credit costs from Edge Config with fallback
 */
export async function getPlannerAICreditCosts(): Promise<CreditCosts> {
  try {
    const costs = await getEdgeConfig('plannerAICreditCosts', DEFAULT_PLANNER_AI_CREDIT_COSTS);
    
    // Validate the data structure
    if (costs && typeof costs === 'object') {
      return costs as CreditCosts;
    }
    
    console.warn('Invalid planner AI credit costs from Edge Config, using fallback');
    return DEFAULT_PLANNER_AI_CREDIT_COSTS;
  } catch (error) {
    console.error('Error getting planner AI credit costs from Edge Config:', error);
    return DEFAULT_PLANNER_AI_CREDIT_COSTS;
  }
}

/**
 * Get couple subscription credits from Edge Config with fallback
 */
export async function getCoupleSubscriptionCredits(): Promise<Record<CoupleSubscriptionTier, CreditAllocation>> {
  try {
    const credits = await getEdgeConfig('coupleSubscriptionCredits', DEFAULT_COUPLE_SUBSCRIPTION_CREDITS);
    
    // Validate the data structure
    if (credits && typeof credits === 'object') {
      return credits as any;
    }
    
    console.warn('Invalid couple subscription credits from Edge Config, using fallback');
    return DEFAULT_COUPLE_SUBSCRIPTION_CREDITS;
  } catch (error) {
    console.error('Error getting couple subscription credits from Edge Config:', error);
    return DEFAULT_COUPLE_SUBSCRIPTION_CREDITS;
  }
}

/**
 * Get planner subscription credits from Edge Config with fallback
 */
export async function getPlannerSubscriptionCredits(): Promise<Record<PlannerSubscriptionTier, CreditAllocation>> {
  try {
    const credits = await getEdgeConfig('plannerSubscriptionCredits', DEFAULT_PLANNER_SUBSCRIPTION_CREDITS);
    
    // Validate the data structure
    if (credits && typeof credits === 'object') {
      return credits as any;
    }
    
    console.warn('Invalid planner subscription credits from Edge Config, using fallback');
    return DEFAULT_PLANNER_SUBSCRIPTION_CREDITS;
  } catch (error) {
    console.error('Error getting planner subscription credits from Edge Config:', error);
    return DEFAULT_PLANNER_SUBSCRIPTION_CREDITS;
  }
}

/**
 * Get credit costs based on user type (with Edge Config fallback)
 */
export async function getCreditCosts(userType: UserType): Promise<CreditCosts> {
  if (userType === 'couple') {
    return await getCoupleAICreditCosts();
  } else {
    return await getPlannerAICreditCosts();
  }
}

/**
 * Get subscription credits based on user type and tier (with Edge Config fallback)
 */
export async function getSubscriptionCredits(userType: UserType, tier: string): Promise<CreditAllocation | null> {
  try {
    if (userType === 'couple') {
      const coupleCredits = await getCoupleSubscriptionCredits();
      console.log('🔍 Edge Config couple credits:', { tier, coupleCredits, found: coupleCredits[tier as CoupleSubscriptionTier] });
      return coupleCredits[tier as CoupleSubscriptionTier] || null;
    } else {
      const plannerCredits = await getPlannerSubscriptionCredits();
      console.log('🔍 Edge Config planner credits:', { tier, plannerCredits, found: plannerCredits[tier as PlannerSubscriptionTier] });
      return plannerCredits[tier as PlannerSubscriptionTier] || null;
    }
  } catch (error) {
    console.error('Error getting subscription credits:', error);
    return null;
  }
}

/**
 * Check if Edge Config is available for credit configuration
 */
export function isCreditConfigAvailable(): boolean {
  return isEdgeConfigAvailable();
}
