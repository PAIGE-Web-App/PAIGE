// Credit System Types for PAIGE App
// Supports both Couple and Planner user types

export type UserType = 'couple' | 'planner';

export type CoupleSubscriptionTier = 'free' | 'premium' | 'pro';
export type PlannerSubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export type SubscriptionTier = CoupleSubscriptionTier | PlannerSubscriptionTier;

// AI Feature Types
export type CoupleAIFeature = 
  | 'draft_messaging'
  | 'todo_generation'
  | 'file_analysis'
  | 'message_analysis'
  | 'integrated_planning'
  | 'budget_generation'
  | 'budget_generation_rag'
  | 'vibe_generation'
  | 'bulk_vibe_generation'
  | 'vendor_suggestions'
  | 'follow_up_questions'
  | 'guest_notes_generation'
  | 'seating_layout_generation'
  | 'rag_document_processing'
  | 'rag_query_processing';

export type PlannerAIFeature = 
  | 'client_communication'
  | 'vendor_coordination'
  | 'client_planning'
  | 'vendor_analysis'
  | 'client_portal_content'
  | 'business_analytics'
  | 'client_onboarding'
  | 'vendor_contract_review'
  | 'client_timeline_creation'
  | 'budget_generation_rag'
  | 'follow_up_questions'
  | 'rag_document_processing'
  | 'rag_query_processing';

export type AIFeature = CoupleAIFeature | PlannerAIFeature;

// Credit Transaction Types
export type CreditTransactionType = 'earned' | 'spent' | 'purchased' | 'refunded' | 'bonus';

export interface CreditTransaction {
  id: string;
  type: CreditTransactionType;
  amount: number;
  feature: AIFeature;
  timestamp: Date;
  metadata?: Record<string, any>;
  description?: string;
}

// User Credits Interface
export interface UserCredits {
  userId: string;
  userType: UserType;
  subscriptionTier: SubscriptionTier;
  dailyCredits: number;        // Resets daily to subscription default
  bonusCredits: number;        // Never resets, admin-given
  totalCreditsUsed: number;
  lastCreditRefresh: Date;
  creditHistory: CreditTransaction[];
  
  // Planner-specific fields
  clientCount?: number;
  maxClients?: number;
  businessName?: string;
  businessType?: string;
  
  // Couple-specific fields
  weddingDate?: Date;
  partnerName?: string;
  guestCount?: number;
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
}

// Credit Configuration Interfaces
export interface CreditAllocation {
  monthlyCredits: number;
  rolloverCredits: number;
  aiFeatures: AIFeature[];
  creditRefresh: 'daily' | 'monthly' | 'yearly';
  maxVendors?: number;
  maxContacts?: number;
  maxClients?: number;
  maxBoards?: number;
  maxFiles?: number;
}

export interface CreditCosts {
  [key: string]: number;
}

// Subscription Credit Configurations
export const COUPLE_SUBSCRIPTION_CREDITS: Record<CoupleSubscriptionTier, CreditAllocation> = {
  free: {
    monthlyCredits: 15,
    rolloverCredits: 0,
    aiFeatures: ['draft_messaging', 'todo_generation', 'file_analysis', 'budget_generation', 'budget_generation_rag', 'vibe_generation', 'bulk_vibe_generation'],
    creditRefresh: 'daily',
    maxVendors: 20,
    maxContacts: 5,
    maxBoards: 2,
    maxFiles: 25
  },
  premium: {
    monthlyCredits: 60,
    rolloverCredits: 15,
    aiFeatures: ['draft_messaging', 'todo_generation', 'file_analysis', 'message_analysis', 'vibe_generation', 'budget_generation', 'budget_generation_rag', 'vendor_suggestions', 'rag_document_processing', 'rag_query_processing'],
    creditRefresh: 'daily',
    maxVendors: -1, // unlimited
    maxContacts: -1,
    maxBoards: 5,
    maxFiles: 100
  },
  pro: {
    monthlyCredits: 150,
    rolloverCredits: 50,
    aiFeatures: ['draft_messaging', 'todo_generation', 'file_analysis', 'message_analysis', 'integrated_planning', 'budget_generation', 'budget_generation_rag', 'vibe_generation', 'vendor_suggestions', 'follow_up_questions', 'rag_document_processing', 'rag_query_processing'],
    creditRefresh: 'daily',
    maxVendors: -1,
    maxContacts: -1,
    maxBoards: 10,
    maxFiles: 500
  }
};

export const PLANNER_SUBSCRIPTION_CREDITS: Record<PlannerSubscriptionTier, CreditAllocation> = {
  free: {
    monthlyCredits: 25,
    rolloverCredits: 0,
    aiFeatures: ['client_communication', 'vendor_coordination', 'budget_generation_rag'],
    creditRefresh: 'daily',
    maxClients: 2,
    maxVendors: 50
  },
  starter: {
    monthlyCredits: 100,
    rolloverCredits: 25,
    aiFeatures: ['client_communication', 'vendor_coordination', 'client_planning', 'vendor_analysis', 'budget_generation_rag', 'rag_document_processing', 'rag_query_processing'],
    creditRefresh: 'daily',
    maxClients: 5,
    maxVendors: 200
  },
  professional: {
    monthlyCredits: 300,
    rolloverCredits: 100,
    aiFeatures: ['client_communication', 'vendor_coordination', 'client_planning', 'vendor_analysis', 'client_portal_content', 'business_analytics', 'vendor_contract_review', 'budget_generation_rag', 'rag_document_processing', 'rag_query_processing'],
    creditRefresh: 'daily',
    maxClients: 15,
    maxVendors: 1000
  },
  enterprise: {
    monthlyCredits: 1000,
    rolloverCredits: 300,
    aiFeatures: ['client_communication', 'vendor_coordination', 'client_planning', 'vendor_analysis', 'client_portal_content', 'business_analytics', 'client_onboarding', 'vendor_contract_review', 'client_timeline_creation', 'budget_generation_rag', 'follow_up_questions', 'rag_document_processing', 'rag_query_processing'],
    creditRefresh: 'daily',
    maxClients: 50,
    maxVendors: -1
  }
};

// AI Feature Credit Costs
export const COUPLE_AI_CREDIT_COSTS: Record<CoupleAIFeature, number> = {
  draft_messaging: 1,
  todo_generation: 2,
  file_analysis: 3,
  message_analysis: 2,
  integrated_planning: 5,
  budget_generation: 3,
  budget_generation_rag: 5,
  vibe_generation: 2,
  bulk_vibe_generation: 5,
  vendor_suggestions: 2,
  follow_up_questions: 1,
  guest_notes_generation: 3,
  seating_layout_generation: 4,
  rag_document_processing: 2,
  rag_query_processing: 3
};

export const PLANNER_AI_CREDIT_COSTS: Record<PlannerAIFeature, number> = {
  client_communication: 1,
  vendor_coordination: 2,
  client_planning: 3,
  vendor_analysis: 2,
  client_portal_content: 2,
  business_analytics: 3,
  client_onboarding: 2,
  vendor_contract_review: 3,
  client_timeline_creation: 4,
  budget_generation_rag: 5,
  follow_up_questions: 1,
  rag_document_processing: 2,
  rag_query_processing: 3
};

// Helper function to get credit costs based on user type
export function getCreditCosts(userType: UserType): Record<string, number> {
  return userType === 'couple' ? COUPLE_AI_CREDIT_COSTS : PLANNER_AI_CREDIT_COSTS;
}

// Helper function to get subscription credits based on user type and tier
export function getSubscriptionCredits(userType: UserType, tier: SubscriptionTier): CreditAllocation {
  if (userType === 'couple') {
    return COUPLE_SUBSCRIPTION_CREDITS[tier as CoupleSubscriptionTier];
  } else {
    return PLANNER_SUBSCRIPTION_CREDITS[tier as PlannerSubscriptionTier];
  }
}

// Helper function to calculate total available credits
export function getTotalAvailableCredits(credits: UserCredits): number {
  return credits.dailyCredits + credits.bonusCredits;
}

// Credit validation result
export interface CreditValidationResult {
  hasEnoughCredits: boolean;
  requiredCredits: number;
  currentCredits: number;
  remainingCredits: number;
  canProceed: boolean;
  message?: string;
}
