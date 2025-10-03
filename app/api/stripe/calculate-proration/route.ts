import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminAuth } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  let targetTier: string | undefined;
  
  try {
    console.log('🔄 Starting proration calculation...');
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No auth header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the Firebase token
    const token = authHeader.split('Bearer ')[1];
    console.log('🔑 Verifying token...');
    const decodedToken = await adminAuth.verifyIdToken(token);
    userId = decodedToken.uid;
    console.log('✅ Token verified for user:', userId);

    let body;
    try {
      body = await request.json();
      console.log('📝 Request body:', body);
    } catch (jsonError) {
      console.error('❌ Failed to parse JSON:', jsonError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    targetTier = body.targetTier;

    if (!targetTier) {
      return NextResponse.json({ error: 'Missing targetTier parameter' }, { status: 400 });
    }

    // Get user's current subscription from Firestore
    console.log('🔍 Fetching user data from Firestore...');
    const { adminDb } = await import('@/lib/firebaseAdmin');
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    console.log('👤 User data:', {
      hasUserData: !!userData,
      hasBilling: !!userData?.billing,
      hasSubscription: !!userData?.billing?.subscription,
      stripeSubscriptionId: userData?.billing?.subscription?.stripeSubscriptionId
    });
    
    if (!userData?.billing?.subscription?.stripeSubscriptionId) {
      console.log('❌ No active subscription found');
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

    // Use Stripe's subscription update preview to calculate proration
    let upcomingInvoice;
    try {
      console.log('🔄 Using Stripe subscription update preview...');
      
      // First, let's try to get the upcoming invoice without changes
      const baseInvoice = await stripe.invoices.retrieveUpcoming({
        customer: currentSubscription.customer,
        subscription: currentSubscriptionId,
      });
      
      console.log('📊 Base upcoming invoice:', {
        id: baseInvoice.id,
        amount_due: baseInvoice.amount_due,
        currency: baseInvoice.currency
      });
      
      // Now try to get the invoice with the new price
      const updatedInvoice = await stripe.invoices.retrieveUpcoming({
        customer: currentSubscription.customer,
        subscription: currentSubscriptionId,
        subscription_items: [{
          id: currentSubscription.items.data[0].id,
          price: targetPriceId,
        }],
      });
      
      console.log('📊 Updated upcoming invoice:', {
        id: updatedInvoice.id,
        amount_due: updatedInvoice.amount_due,
        currency: updatedInvoice.currency
      });
      
      // Calculate the difference (refund amount)
      const refundAmount = Math.max(0, baseInvoice.amount_due - updatedInvoice.amount_due);
      
      upcomingInvoice = {
        id: updatedInvoice.id,
        amount_due: -refundAmount, // Negative for refund
        currency: updatedInvoice.currency,
        lines: updatedInvoice.lines
      };
      
      console.log('✅ Successfully calculated proration using Stripe API');
      console.log('💰 Proration calculation:', {
        baseAmount: baseInvoice.amount_due,
        updatedAmount: updatedInvoice.amount_due,
        refundAmount: refundAmount,
        refundAmountDollars: (refundAmount / 100).toFixed(2)
      });
      
    } catch (methodError) {
      console.log('❌ Stripe API failed, trying alternative approach...');
      console.log('Method error:', methodError.message);
      
      // Alternative: Use subscription update preview
      try {
        console.log('🔄 Trying subscription update preview...');
        
        // Get current subscription details
        const currentSub = await stripe.subscriptions.retrieve(currentSubscriptionId);
        const currentPrice = await stripe.prices.retrieve(currentPriceId);
        const targetPrice = await stripe.prices.retrieve(targetPriceId);
        
        console.log('📊 Subscription and price details:', {
          currentPriceAmount: currentPrice.unit_amount,
          targetPriceAmount: targetPrice.unit_amount,
          currentPeriodEnd: currentSub.current_period_end,
          currentPeriodStart: currentSub.current_period_start
        });
        
        // Calculate proration manually using proper time calculations
        const now = Math.floor(Date.now() / 1000);
        const periodStart = currentSub.current_period_start;
        const periodEnd = currentSub.current_period_end;
        
        if (!periodEnd || !periodStart) {
          throw new Error('Invalid subscription period data');
        }
        
        const timeRemaining = periodEnd - now;
        const totalPeriod = periodEnd - periodStart;
        const prorationRatio = Math.max(0, timeRemaining / totalPeriod);
        
        const currentAmount = (currentPrice.unit_amount || 0) * prorationRatio;
        const targetAmount = (targetPrice.unit_amount || 0) * prorationRatio;
        const refundAmount = Math.max(0, currentAmount - targetAmount);
        
        // Create a mock invoice object for proration calculation
        upcomingInvoice = {
          id: 'upcoming_manual_' + Date.now(),
          amount_due: -refundAmount, // Negative for refund
          currency: 'usd',
          lines: {
            data: [{
              amount: -refundAmount,
              description: 'Proration refund'
            }]
          }
        };
        
        console.log('✅ Used manual proration calculation');
        console.log('💰 Manual proration details:', {
          refundAmountCents: refundAmount,
          refundAmountDollars: (refundAmount / 100).toFixed(2),
          prorationRatio: prorationRatio.toFixed(4),
          timeRemaining: timeRemaining,
          totalPeriod: totalPeriod,
          currentAmount: currentAmount,
          targetAmount: targetAmount
        });
      } catch (altError) {
        console.error('❌ Manual calculation failed:', altError.message);
        throw new Error(`Stripe API methods failed: ${methodError.message}, Manual calculation failed: ${altError.message}`);
      }
    }

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
