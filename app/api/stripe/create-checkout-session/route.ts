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

    const { type, tier, pack } = await request.json();

    if (!type || (type === 'subscription' && !tier) || (type === 'credits' && !pack)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let priceId: string;
    let successUrl: string;
    let cancelUrl: string;

    if (type === 'subscription') {
      // Handle subscription checkout
      const subscriptionConfig = {
        couple_premium: 'price_1SDWtTBHpYhRPcSucCjKgQe4',
        couple_pro: 'price_1SDWtuBHpYhRPcSu5BP3GfjC',
        planner_starter: 'price_1SDWuiBHpYhRPcSuMPEmnMsx',
        planner_professional: 'price_1SDWv2BHpYhRPcSuQ72Bhvw1'
      };

      priceId = subscriptionConfig[tier as keyof typeof subscriptionConfig];
      if (!priceId) {
        return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
      }

      // Force correct domain for production
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://www.weddingpaige.com' 
        : 'http://localhost:3000';
      
      successUrl = `${baseUrl}/settings?tab=plan&success=true&type=subscription`;
      cancelUrl = `${baseUrl}/settings?tab=plan&canceled=true`;

    } else if (type === 'credits') {
      // Handle credit pack checkout
      const creditPackConfig = {
        credits_12: 'price_1SDWvgBHpYhRPcSujcZPci3S',
        credits_25: 'price_1SDWw9BHpYhRPcSuloTonaNz',
        credits_50: 'price_1SDWwSBHpYhRPcSugoilYdja',
        credits_100: 'price_1SDWwlBHpYhRPcSu0ljB5vIm',
        credits_200: 'price_1SDWx6BHpYhRPcSucW1003Sx'
      };

      priceId = creditPackConfig[pack as keyof typeof creditPackConfig];
      if (!priceId) {
        return NextResponse.json({ error: 'Invalid credit pack' }, { status: 400 });
      }

      successUrl = `${baseUrl}/settings?tab=plan&success=true&type=credits`;
      cancelUrl = `${baseUrl}/settings?tab=plan&canceled=true`;

    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Create or retrieve Stripe customer
    let customerId: string;
    
    try {
      // Get user email from Firebase
      const userRecord = await adminAuth.getUser(userId);
      const userEmail = userRecord.email;
      
      if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }

      // Try to find existing customer by email
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            userId: userId
          }
        });
        customerId = customer.id;
      }
    } catch (error) {
      console.error('Error managing Stripe customer:', error);
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    // Create checkout session
    const sessionConfig: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: type === 'subscription' ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        type: type,
        ...(type === 'subscription' && { tier }),
        ...(type === 'credits' && { pack }),
      },
    };

    // Add subscription-specific settings
    if (type === 'subscription') {
      sessionConfig.subscription_data = {
        metadata: {
          userId: userId,
          tier: tier,
        },
      };
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ 
      url: checkoutSession.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
