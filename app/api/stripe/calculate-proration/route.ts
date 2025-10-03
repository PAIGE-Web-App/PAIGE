import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminAuth } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the Firebase token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { targetTier } = await request.json();

    if (!targetTier) {
      return NextResponse.json({ error: 'Missing targetTier parameter' }, { status: 400 });
    }

    // Get user's current subscription from Firestore
    const { adminDb } = await import('@/lib/firebaseAdmin');
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.billing?.subscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    const currentSubscriptionId = userData.billing.subscription.stripeSubscriptionId;
    const currentTier = userData.billing.subscription.tier;

    // Check if this is a downgrade
    const tierOrder = { 'free': 0, 'couple_premium': 1, 'couple_pro': 2, 'planner_starter': 1, 'planner_professional': 2 };
    const currentTierLevel = tierOrder[currentTier as keyof typeof tierOrder] || 0;
    const newTierLevel = tierOrder[targetTier as keyof typeof tierOrder] || 0;
    
    if (newTierLevel >= currentTierLevel) {
      return NextResponse.json({ 
        isDowngrade: false,
        message: 'This is not a downgrade'
      });
    }

    // Get price ID for target tier
    const subscriptionConfig = {
      couple_premium: 'price_1SDWtTBHpYhRPcSucCjKgQe4',
      couple_pro: 'price_1SDWtuBHpYhRPcSu5BP3GfjC',
      planner_starter: 'price_1SDWuiBHpYhRPcSuMPEmnMsx',
      planner_professional: 'price_1SDWv2BHpYhRPcSuQ72Bhvw1'
    };

    const targetPriceId = subscriptionConfig[targetTier as keyof typeof subscriptionConfig];
    if (!targetPriceId) {
      return NextResponse.json({ error: 'Invalid target tier' }, { status: 400 });
    }

    // Get current subscription details
    const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
    const currentPriceId = currentSubscription.items.data[0].price.id;

    // Calculate proration using Stripe's preview
    console.log('🔄 Retrieving upcoming invoice for proration calculation...');
    console.log('Subscription details:', {
      customer: currentSubscription.customer,
      subscriptionId: currentSubscriptionId,
      currentPriceId: currentPriceId,
      targetPriceId: targetPriceId
    });

    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: currentSubscription.customer,
      subscription: currentSubscriptionId,
      subscription_items: [{
        id: currentSubscription.items.data[0].id,
        price: targetPriceId,
      }],
      subscription_proration_behavior: 'create_prorations',
    });

    console.log('📊 Upcoming invoice retrieved:', {
      id: upcomingInvoice.id,
      amount_due: upcomingInvoice.amount_due,
      currency: upcomingInvoice.currency
    });

    // Calculate refund amount (negative amount_due means refund)
    const refundAmount = Math.abs(upcomingInvoice.amount_due);
    const refundAmountCents = refundAmount;
    const refundAmountDollars = (refundAmount / 100).toFixed(2);

    console.log('💰 Proration calculation:', {
      currentTier,
      targetTier,
      currentPriceId,
      targetPriceId,
      refundAmountCents,
      refundAmountDollars,
      upcomingInvoiceId: upcomingInvoice.id
    });

    return NextResponse.json({
      isDowngrade: true,
      refundAmountCents,
      refundAmountDollars,
      currentTier,
      targetTier,
      upcomingInvoiceId: upcomingInvoice.id
    });

  } catch (error) {
    console.error('Error calculating proration:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      targetTier
    });
    return NextResponse.json({ 
      error: 'Failed to calculate proration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
