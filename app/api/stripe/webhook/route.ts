import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { creditServiceAdmin } from '@/lib/creditServiceAdmin';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    console.error('Body length:', body.length);
    console.error('Signature:', signature);
    console.error('Webhook secret exists:', !!webhookSecret);
    
    // For development, let's skip signature verification temporarily
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Skipping signature verification in development mode');
      try {
        event = JSON.parse(body);
      } catch (parseErr) {
        console.error('Failed to parse body as JSON:', parseErr);
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: any) {
  console.log('=== CHECKOUT COMPLETED DEBUG ===');
  console.log('Session ID:', session.id);
  console.log('Session metadata:', session.metadata);
  console.log('Subscription ID:', session.subscription);
  
  const { userId, type, tier, pack } = session.metadata;
  
  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  if (type === 'subscription') {
    // Subscription will be handled by subscription.created event
    console.log(`Checkout completed for subscription: ${tier} for user: ${userId}`);
  } else if (type === 'credits') {
    // Handle credit pack purchase
    await handleCreditPackPurchase(userId, pack);
  }
}

async function handleSubscriptionChange(subscription: any) {
  console.log('=== SUBSCRIPTION CHANGE DEBUG ===');
  console.log('Subscription ID:', subscription.id);
  console.log('Subscription metadata:', subscription.metadata);
  console.log('Subscription status:', subscription.status);
  
  const userId = subscription.metadata?.userId;
  const tier = subscription.metadata?.tier;
  
  if (!userId || !tier) {
    console.error('Missing userId or tier in subscription metadata');
    console.error('Available metadata keys:', Object.keys(subscription.metadata || {}));
    return;
  }

  const status = subscription.status;
  const subscriptionId = subscription.id;
  const customerId = subscription.customer;

  // Get current_period_end from subscription items
  const currentPeriodEnd = subscription.items?.data?.[0]?.current_period_end || subscription.current_period_end;
  
  // Update user's subscription in Firestore
  console.log('Updating user subscription:', {
    userId,
    status,
    tier,
    subscriptionId,
    customerId,
    currentPeriodEnd,
    currentPeriodEndDate: new Date(currentPeriodEnd * 1000)
  });

  // Convert Stripe tier to credit system tier
  const creditTier = tier.replace('couple_', '').replace('planner_', '');
  
  console.log(`=== UPDATING USER SUBSCRIPTION ===`);
  console.log(`User ID: ${userId}`);
  console.log(`Stripe tier: ${tier}`);
  console.log(`Credit tier: ${creditTier}`);
  console.log(`Status: ${status}`);
  
  await adminDb.collection('users').doc(userId).update({
    'billing.subscription': {
      status,
      tier,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      updatedAt: new Date()
    },
    'credits.subscriptionTier': creditTier,
    'credits.updatedAt': new Date()
  });
  
  console.log(`✅ Updated user ${userId} subscription to ${creditTier}`);

  // If subscription is active, update user's subscription tier and add bonus credits
  if (status === 'active') {
    await handleSubscriptionActivation(userId, tier);
    
    // Force credit refresh to update daily credits for new tier
    try {
      console.log(`🔄 Forcing credit refresh for user ${userId}...`);
      const { creditService } = await import('@/lib/creditService');
      const refreshedCredits = await creditService.forceRefreshCredits(userId);
      console.log(`✅ Forced credit refresh completed for user ${userId}:`, refreshedCredits);
      
      // Notify frontend that credits have been updated
      try {
        const { creditEventEmitter } = await import('@/lib/creditEventEmitter');
        creditEventEmitter.emit('creditsUpdated', { userId, credits: refreshedCredits });
        console.log(`📡 Emitted credit update event for user ${userId}`);
      } catch (eventError) {
        console.error(`❌ Error emitting credit update event for user ${userId}:`, eventError);
      }
    } catch (error) {
      console.error(`❌ Error forcing credit refresh for user ${userId}:`, error);
    }
  }

  console.log(`Subscription ${status} for user ${userId}, tier: ${tier}`);
}

async function handleSubscriptionCancelled(subscription: any) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  // Downgrade user to free tier
  await adminDb.collection('users').doc(userId).update({
    'billing.subscription.status': 'cancelled',
    'billing.subscription.updatedAt': new Date()
  });

  // Update user's subscription tier to free
  const userRef = adminDb.collection('users').doc(userId);
  const userSnap = await userRef.get();
  
  if (userSnap.exists) {
    const userData = userSnap.data();
    if (userData?.credits) {
      // Update subscription tier to free
      await userRef.update({
        'credits.subscriptionTier': 'free',
        'credits.updatedAt': new Date()
      });
    }
  }

  console.log(`Subscription cancelled for user ${userId}`);
}

async function handlePaymentSucceeded(invoice: any) {
  console.log(`Payment succeeded for invoice ${invoice.id}`);
  // Additional logic for successful payments if needed
}

async function handlePaymentFailed(invoice: any) {
  console.log(`Payment failed for invoice ${invoice.id}`);
  // Handle failed payments - maybe send notification to user
}

async function handleCreditPackPurchase(userId: string, pack: string) {
  const creditAmounts = {
    credits_12: 12,
    credits_25: 25,
    credits_50: 50,
    credits_100: 100,
    credits_200: 200
  };

  const credits = creditAmounts[pack as keyof typeof creditAmounts];
  if (!credits) {
    console.error(`Invalid credit pack: ${pack}`);
    return;
  }

  // Add bonus credits to user
  await creditServiceAdmin.addBonusCredits(userId, credits, 'purchase');

  // Update billing record
  await adminDb.collection('users').doc(userId).update({
    'billing.creditPurchases.totalPurchased': FieldValue.increment(credits),
    'billing.creditPurchases.lastPurchase': new Date(),
    'billing.creditPurchases.purchaseHistory': FieldValue.arrayUnion({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: credits,
      pack: pack,
      timestamp: new Date()
    })
  });

  // Notify frontend that credits have been updated
  try {
    const { creditEventEmitter } = await import('@/lib/creditEventEmitter');
    creditEventEmitter.emit('creditsUpdated', { userId, credits: credits });
    console.log(`📡 Emitted credit update event for user ${userId}`);
  } catch (eventError) {
    console.error(`❌ Error emitting credit update event for user ${userId}:`, eventError);
  }

  console.log(`Added ${credits} credits to user ${userId} from pack ${pack}`);
}

async function handleSubscriptionActivation(userId: string, tier: string) {
  // Check if we've already processed this upgrade to prevent duplicate bonus credits
  const userRef = adminDb.collection('users').doc(userId);
  const userSnap = await userRef.get();
  
  if (userSnap.exists) {
    const userData = userSnap.data();
    const currentTier = userData?.credits?.subscriptionTier;
    
    // If user is already on this tier, don't add bonus credits again
    if (currentTier === tier) {
      console.log(`User ${userId} already on ${tier} tier, skipping bonus credits`);
      return;
    }
  }

  // Add bonus credits for upgrade
  const bonusCredits = {
    couple_premium: 60,
    couple_pro: 120,
    planner_starter: 80,
    planner_professional: 180
  };

  const credits = bonusCredits[tier as keyof typeof bonusCredits];
  if (credits) {
    await creditServiceAdmin.addBonusCredits(userId, credits, 'upgrade');
    console.log(`Added ${credits} bonus credits to user ${userId} for ${tier} upgrade`);
  }
}
