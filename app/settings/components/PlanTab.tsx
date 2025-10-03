"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { loadStripe } from '@stripe/stripe-js';
import PlanCard from '@/components/billing/PlanCard';
import CreditPackCard from '@/components/billing/CreditPackCard';
import CreditPackSelector from '@/components/billing/CreditPackSelector';
import DowngradeConfirmationModal from '@/components/billing/DowngradeConfirmationModal';
import DowngradeTester from '@/components/billing/DowngradeTester';
import { Sparkles, CreditCard, Zap, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PlanTab() {
  const { user, userType } = useAuth();
  const { credits, loadCredits, refreshCredits } = useCredits();
  const [loading, setLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [downgradeModal, setDowngradeModal] = useState<{
    isOpen: boolean;
    targetPlan: string;
    targetPlanName: string;
    targetCredits: number;
  }>({
    isOpen: false,
    targetPlan: '',
    targetPlanName: '',
    targetCredits: 0
  });

  const [pendingDowngrade, setPendingDowngrade] = useState<{
    targetPlan: string;
    targetPlanName: string;
    effectiveDate: string;
  } | null>(null);

  // Load pending downgrade from Firestore on mount
  useEffect(() => {
    const loadPendingDowngrade = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/billing/pending-downgrade', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.pendingDowngrade) {
            setPendingDowngrade(data.pendingDowngrade);
          }
        }
      } catch (error) {
        console.error('Error loading pending downgrade:', error);
      }
    };

    loadPendingDowngrade();
  }, [user]);

  // Convert Stripe tier to plan tier for matching
  const getPlanTier = (stripeTier: string) => {
    if (stripeTier === 'couple_premium' || stripeTier === 'premium') return 'couple_premium';
    if (stripeTier === 'couple_pro' || stripeTier === 'pro') return 'couple_pro';
    if (stripeTier === 'planner_starter' || stripeTier === 'starter') return 'planner_starter';
    if (stripeTier === 'planner_professional' || stripeTier === 'professional') return 'planner_professional';
    return 'free';
  };
  
  const currentTier = getPlanTier(credits?.subscriptionTier || 'free');
  
  // Helper function to determine if a plan is a lower tier than current
  const isLowerTier = (planTier: string) => {
    const tierOrder = ['free', 'couple_premium', 'couple_pro', 'planner_starter', 'planner_professional'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const planIndex = tierOrder.indexOf(planTier);
    return planIndex < currentIndex;
  };

  const couplePlans = [
    {
      name: 'Free',
      price: 0,
      creditsPerDay: 15,
      bonusCredits: 0,
      features: [
        'Basic AI features',
        'File analysis',
        'Budget generation',
        'Vibe generation',
        'Up to 20 vendors',
        'Up to 5 contacts'
      ],
      tier: 'free'
    },
    {
      name: 'Premium',
      price: 15,
      creditsPerDay: 22,
      bonusCredits: 60,
      features: [
        'All free features',
        'Message analysis',
        'Vendor suggestions',
        'RAG document processing',
        'Unlimited vendors & contacts',
        'Up to 5 mood boards',
        'Up to 100 files'
      ],
      tier: 'couple_premium',
      isPopular: true
    },
    {
      name: 'Pro',
      price: 20,
      creditsPerDay: 45,
      bonusCredits: 120,
      features: [
        'All premium features',
        'Integrated planning',
        'Follow-up questions',
        'Advanced AI features',
        'Up to 10 mood boards',
        'Up to 500 files',
        'Priority support'
      ],
      tier: 'couple_pro'
    }
  ];

  const plannerPlans = [
    {
      name: 'Free',
      price: 0,
      creditsPerDay: 25,
      bonusCredits: 0,
      features: [
        'Basic business features',
        'Client communication',
        'Vendor coordination',
        'Up to 2 clients',
        'Up to 50 vendors'
      ],
      tier: 'free'
    },
    {
      name: 'Starter',
      price: 20,
      creditsPerDay: 35,
      bonusCredits: 80,
      features: [
        'All free features',
        'Client planning',
        'Vendor analysis',
        'RAG document processing',
        'Up to 5 clients',
        'Up to 200 vendors'
      ],
      tier: 'planner_starter',
      isPopular: true
    },
    {
      name: 'Professional',
      price: 35,
      creditsPerDay: 90,
      bonusCredits: 180,
      features: [
        'All starter features',
        'Client portal content',
        'Business analytics',
        'Vendor contract review',
        'Up to 15 clients',
        'Up to 1000 vendors',
        'Priority support'
      ],
      tier: 'planner_professional'
    }
  ];

  const creditPacks = [
    {
      name: '12 Credits',
      credits: 12,
      price: 2,
      description: 'Perfect for light usage',
      pack: 'credits_12'
    },
    {
      name: '25 Credits',
      credits: 25,
      price: 4,
      description: 'Great for moderate usage',
      pack: 'credits_25'
    },
    {
      name: '50 Credits',
      credits: 50,
      price: 7,
      description: 'Popular choice for regular users',
      pack: 'credits_50',
      isPopular: true
    },
    {
      name: '100 Credits',
      credits: 100,
      price: 12,
      description: 'Best value for heavy users',
      pack: 'credits_100'
    },
    {
      name: '200 Credits',
      credits: 200,
      price: 20,
      description: 'Maximum value pack',
      pack: 'credits_200'
    }
  ];

  const plans = userType === 'couple' ? couplePlans : plannerPlans;

  // Helper function to parse Firestore timestamps
  const parseFirestoreDate = (timestamp: any): string => {
    try {
      let date;
      
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp && typeof timestamp === 'object') {
        if ('_seconds' in timestamp) {
          date = new Date(timestamp._seconds * 1000);
        } else if ('seconds' in timestamp) {
          date = new Date(timestamp.seconds * 1000);
        } else {
          date = new Date(timestamp);
        }
      } else {
        date = new Date(timestamp);
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date parsing error:', error, 'timestamp:', timestamp);
      return 'Date unavailable';
    }
  };

  const handleUpgrade = async (tier: string) => {
    // Check if this is a downgrade
    const tierOrder = ['free', 'couple_premium', 'couple_pro', 'planner_starter', 'planner_professional'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const targetIndex = tierOrder.indexOf(tier);
    
    if (targetIndex < currentIndex) {
      // This is a downgrade - show confirmation modal
      const targetPlan = plans.find(p => p.tier === tier);
      if (targetPlan) {
        setDowngradeModal({
          isOpen: true,
          targetPlan: tier,
          targetPlanName: targetPlan.name,
          targetCredits: targetPlan.creditsPerDay
        });
      }
      return;
    }
    
    // Don't allow upgrading to free plan (free is not an upgrade)
    if (tier === 'free') {
      return;
    }
    
    // This is an upgrade - proceed normally
    setLoading(tier);
    try {
      // Get Firebase token
      const token = await user?.getIdToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'subscription',
          tier: tier
        }),
      });

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(null);
    }
  };

  const handlePurchaseCredits = async (pack: string) => {
    setLoading(pack);
    try {
      // Get Firebase token
      const token = await user?.getIdToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'credits',
          pack: pack
        }),
      });

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleDowngradeConfirm = async () => {
    console.log('🔄 Starting downgrade confirmation...');
    setLoading(downgradeModal.targetPlan);
    
    // Store modal data before closing
    const targetPlan = downgradeModal.targetPlan;
    const targetPlanName = downgradeModal.targetPlanName;
    
    console.log('📝 Target plan:', targetPlan, targetPlanName);
    
    // Handle free tier downgrade differently (no Stripe checkout needed)
    if (targetPlan === 'free') {
      console.log('🆓 Handling free tier downgrade...');
      
      // Set pending downgrade state
      const renewalDate = credits?.billing?.subscription?.currentPeriodEnd ? 
        parseFirestoreDate(credits.billing.subscription.currentPeriodEnd) : 'Date unavailable';

      console.log('📅 Renewal date:', renewalDate);

      const pendingDowngradeData = {
        targetPlan: targetPlan,
        targetPlanName: targetPlanName,
        effectiveDate: renewalDate
      };

      setPendingDowngrade(pendingDowngradeData);

      // Save to Firestore
      try {
        const token = await user?.getIdToken();
        if (token) {
          await fetch('/api/billing/pending-downgrade', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(pendingDowngradeData),
          });
        }
      } catch (error) {
        console.error('Error saving pending downgrade:', error);
      }

      // Close modal first
      setDowngradeModal({ isOpen: false, targetPlan: '', targetPlanName: '', targetCredits: 0 });
      
      // Show success toast after a brief delay to ensure modal is closed
      setTimeout(() => {
        console.log('🎉 Showing success toast');
        toast.success(`Downgrade scheduled! You'll switch to ${targetPlanName} on ${renewalDate}.`, {
          duration: 5000,
        });
      }, 300);

      setLoading(null);
      return;
    }
    
    // Handle paid tier downgrades (go through Stripe)
    try {
      // Get Firebase token
      const token = await user?.getIdToken();
      if (!token) {
        console.error('No auth token available');
        toast.error('Authentication required. Please refresh the page.');
        return;
      }

      console.log('🔑 Got auth token, making API call...');

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'subscription',
          tier: targetPlan
        }),
      });

      console.log('📡 API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        toast.error(`API Error: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const { url } = await response.json();
      console.log('✅ Got checkout URL:', url);
      
      if (url) {
        // Close modal first
        setDowngradeModal({ isOpen: false, targetPlan: '', targetPlanName: '', targetCredits: 0 });
        
        // Show redirect toast
        toast.success(`Redirecting to checkout for ${targetPlanName}...`, {
          duration: 3000,
        });

        // Redirect to Stripe checkout immediately
        window.location.href = url;
      } else {
        console.error('No checkout URL received');
        toast.error('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to process downgrade. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleDowngradeCancel = () => {
    setDowngradeModal({ isOpen: false, targetPlan: '', targetPlanName: '', targetCredits: 0 });
  };

  const handleCancelDowngrade = async () => {
    setPendingDowngrade(null);
    
    // Clear from Firestore
    try {
      const token = await user?.getIdToken();
      if (token) {
        await fetch('/api/billing/pending-downgrade', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Error clearing pending downgrade:', error);
    }
    
    toast.success('Downgrade cancelled. You\'ll keep your current plan.');
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      // Force refresh credits (bypasses cache)
      await refreshCredits();
      toast.success('Credits refreshed successfully');
    } catch (error) {
      console.error('Error refreshing credits:', error);
      toast.error('Failed to refresh credits');
    } finally {
      setRefreshing(false);
    }
  };

  const handleWebhookTrigger = async () => {
    setRefreshing(true);
    try {
      const token = await user?.getIdToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/test-webhook-trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Webhook trigger result:', result);
        toast.success('Webhook logic triggered - sidebar should update');
      } else {
        const error = await response.json();
        toast.error(`Webhook trigger failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error triggering webhook:', error);
      toast.error('Failed to trigger webhook');
    } finally {
      setRefreshing(false);
    }
  };


  return (
    <div className="space-y-8 pb-8">
      {/* Development Testing Tools */}
      <DowngradeTester />
      
      {/* Current Plan Status */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h5 className="mb-4">Current Plan</h5>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#805d93]" />
              <span className="font-medium text-[#332B42]">
                {plans.find(p => p.tier === currentTier)?.name || 'Free'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {plans.find(p => p.tier === currentTier)?.creditsPerDay || 15} credits per day
            </div>
          </div>
                 <div className="flex gap-2">
                   <button
                     onClick={handleManualRefresh}
                     disabled={refreshing}
                     className="btn-primaryinverse text-sm px-3 py-1 flex items-center gap-2"
                   >
                     {refreshing ? (
                       <>
                         <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                         Refreshing...
                       </>
                     ) : (
                       <>
                         <Zap className="w-3 h-3" />
                         Refresh Credits
                       </>
                     )}
                   </button>
                   <button
                     onClick={handleWebhookTrigger}
                     disabled={refreshing}
                     className="btn-primary text-sm px-3 py-1 flex items-center gap-2"
                   >
                     {refreshing ? (
                       <>
                         <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                         Triggering...
                       </>
                     ) : (
                       <>
                         <Zap className="w-3 h-3" />
                         Trigger Webhook
                       </>
                     )}
                   </button>
                 </div>
        </div>
        
        {/* Pending downgrade info */}
        {pendingDowngrade && (
          <div className="mt-4 pt-4 border-t border-orange-200">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X className="w-3 h-3 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h5 className="text-orange-800 mb-1">Downgrade Scheduled</h5>
                  <p className="text-sm text-orange-700 mb-3">
                    You'll be downgraded to <strong>{pendingDowngrade.targetPlanName}</strong> on {pendingDowngrade.effectiveDate}.
                  </p>
                  <button
                    onClick={handleCancelDowngrade}
                    className="btn-primaryinverse text-sm px-3 py-1"
                  >
                    Cancel Downgrade
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription renewal info for paid plans */}
        {credits?.billing?.subscription?.currentPeriodEnd && currentTier !== 'free' && !pendingDowngrade && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Renews every 30 days</span>
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span>
                Next renewal: {parseFirestoreDate(credits.billing.subscription.currentPeriodEnd)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Plans */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h5 className="mb-6">Upgrade Your Plan</h5>
        <p className="text-sm text-gray-600 mb-6">
          Get more daily credits and unlock advanced AI features. All plans include bonus credits when you upgrade!
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
                 <PlanCard
                   key={plan.tier}
                   name={plan.name}
                   price={plan.price}
                   creditsPerDay={plan.creditsPerDay}
                   bonusCredits={plan.bonusCredits}
                   features={plan.features}
                   isPopular={plan.isPopular}
                   isCurrent={plan.tier === currentTier}
                   isLowerTier={isLowerTier(plan.tier)}
                   isProTier={plan.tier === 'couple_pro' || plan.tier === 'planner_professional'}
                   onUpgrade={() => handleUpgrade(plan.tier)}
                   loading={loading === plan.tier}
                 />
          ))}
        </div>
      </div>

      {/* Credit Packs */}
      <CreditPackSelector
        onPurchase={handlePurchaseCredits}
        loading={loading !== null && loading.startsWith('credits_')}
      />

      {/* Billing Info */}
      <div className="bg-[#F8F6F4] rounded-lg p-6">
        <h6 className="font-medium text-[#332B42] mb-4">Billing Information</h6>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span>Secure payments powered by Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Credits are added instantly after payment</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Bonus credits are used first, then daily credits</span>
          </div>
        </div>
      </div>

      {/* Downgrade Confirmation Modal */}
      <DowngradeConfirmationModal
        isOpen={downgradeModal.isOpen}
        onClose={handleDowngradeCancel}
        onConfirm={handleDowngradeConfirm}
        currentPlan={plans.find(p => p.tier === currentTier)?.name || 'Current Plan'}
        targetPlan={downgradeModal.targetPlanName}
        currentCredits={plans.find(p => p.tier === currentTier)?.creditsPerDay || 0}
        targetCredits={downgradeModal.targetCredits}
        renewalDate={credits?.billing?.subscription?.currentPeriodEnd ? 
          parseFirestoreDate(credits.billing.subscription.currentPeriodEnd) : undefined
        }
        isLoading={loading === downgradeModal.targetPlan}
      />
    </div>
  );
} 