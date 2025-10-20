import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

// Stripe Product IDs
export const STRIPE_PRODUCTS = {
  // Subscription Products
  COUPLE_PREMIUM: 'prod_TACr483Jw5gqli',
  COUPLE_PRO: 'prod_TACrRjSAEZpzfG', 
  PLANNER_STARTER: 'prod_TACreIfff3DbJd',
  PLANNER_PROFESSIONAL: 'prod_TACrC9qT7wcomf',
  
  // Credit Pack Products
  CREDITS_12: 'prod_TACr9zePubyYyM',
  CREDITS_25: 'prod_TACrYnlN57K21B',
  CREDITS_50: 'prod_TACsUb0jpXxI22',
  CREDITS_100: 'prod_TACsPlBTlUwB0u',
  CREDITS_200: 'prod_TACs26WQ9a779f', 
} as const;

// Pricing Configuration
export const BILLING_CONFIG = {
  subscriptions: {
    couple_premium: {
      priceId: 'price_1SDsRdBd5z9XeQ7SnGFCrWZC',
      amount: 1500, // $15.00 in cents
      creditsPerDay: 22,
      bonusCredits: 60,
      name: 'Couple Premium',
      description: '22 credits/day + 60 bonus credits on upgrade'
    },
    couple_pro: {
      priceId: 'price_1SDsRlBd5z9XeQ7SgWUw62b4', 
      amount: 2000, // $20.00 in cents
      creditsPerDay: 45,
      bonusCredits: 120,
      name: 'Couple Pro',
      description: '45 credits/day + 120 bonus credits on upgrade'
    },
    planner_starter: {
      priceId: 'price_1SDsRrBd5z9XeQ7SEGTc9rcO',
      amount: 2000, // $20.00 in cents
      creditsPerDay: 35,
      bonusCredits: 80,
      name: 'Planner Starter',
      description: '35 credits/day + 80 bonus credits on upgrade'
    },
    planner_professional: {
      priceId: 'price_1SDsRxBd5z9XeQ7SwkgFeO8m',
      amount: 3500, // $35.00 in cents
      creditsPerDay: 90,
      bonusCredits: 180,
      name: 'Planner Professional', 
      description: '90 credits/day + 180 bonus credits on upgrade'
    }
  },
  creditPacks: {
    credits_12: {
      priceId: 'price_1SDsSABd5z9XeQ7SIQB5tH3z',
      amount: 200, // $2.00 in cents
      credits: 12,
      name: '12 Credits',
      description: 'Perfect for light usage'
    },
    credits_25: {
      priceId: 'price_1SDsSFBd5z9XeQ7SqbInFKxt',
      amount: 400, // $4.00 in cents
      credits: 25,
      name: '25 Credits',
      description: 'Great for moderate usage'
    },
    credits_50: {
      priceId: 'price_1SDsSLBd5z9XeQ7SAcjyAvC2',
      amount: 700, // $7.00 in cents
      credits: 50,
      name: '50 Credits',
      description: 'Popular choice for regular users'
    },
    credits_100: {
      priceId: 'price_1SDsSRBd5z9XeQ7SgRVJ6CFS',
      amount: 1200, // $12.00 in cents
      credits: 100,
      name: '100 Credits',
      description: 'Best value for heavy users'
    },
    credits_200: {
      priceId: 'price_1SDsSWBd5z9XeQ7SPNK0rvcO',
      amount: 2000, // $20.00 in cents
      credits: 200,
      name: '200 Credits',
      description: 'Maximum value pack'
    }
  }
} as const;

// Helper function to get subscription config
export function getSubscriptionConfig(tier: string) {
  return BILLING_CONFIG.subscriptions[tier as keyof typeof BILLING_CONFIG.subscriptions];
}

// Helper function to get credit pack config
export function getCreditPackConfig(pack: string) {
  return BILLING_CONFIG.creditPacks[pack as keyof typeof BILLING_CONFIG.creditPacks];
}
