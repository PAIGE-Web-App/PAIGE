# 💳 Stripe Billing Integration Setup Guide

## 🚀 Quick Setup (5 minutes)

### 1. **Create Stripe Account & Get Keys**

1. Go to [stripe.com](https://stripe.com) and create an account
2. Go to **Developers** → **API Keys**
3. Copy your **Publishable key** and **Secret key**

### 2. **Add Environment Variables**

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. **Create Stripe Products & Prices**

In your Stripe Dashboard, create these products:

#### **Subscription Products:**

**Couple Premium:**
- Product Name: "Couple Premium"
- Price: $15.00/month (recurring)
- Price ID: `price_couple_premium_monthly`

**Couple Pro:**
- Product Name: "Couple Pro" 
- Price: $20.00/month (recurring)
- Price ID: `price_couple_pro_monthly`

**Planner Starter:**
- Product Name: "Planner Starter"
- Price: $20.00/month (recurring)
- Price ID: `price_planner_starter_monthly`

**Planner Professional:**
- Product Name: "Planner Professional"
- Price: $35.00/month (recurring)
- Price ID: `price_planner_professional_monthly`

#### **Credit Pack Products:**

**12 Credits:**
- Product Name: "12 Credits"
- Price: $2.00 (one-time)
- Price ID: `price_credits_12`

**25 Credits:**
- Product Name: "25 Credits"
- Price: $4.00 (one-time)
- Price ID: `price_credits_25`

**50 Credits:**
- Product Name: "50 Credits"
- Price: $7.00 (one-time)
- Price ID: `price_credits_50`

**100 Credits:**
- Product Name: "100 Credits"
- Price: $12.00 (one-time)
- Price ID: `price_credits_100`

**200 Credits:**
- Product Name: "200 Credits"
- Price: $20.00 (one-time)
- Price ID: `price_credits_200`

### 4. **Set Up Webhook**

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** and add to `STRIPE_WEBHOOK_SECRET`

### 5. **Test the Integration**

1. Start your development server: `npm run dev`
2. Go to `/settings?tab=plan`
3. Try upgrading to a paid plan (use Stripe test card: `4242 4242 4242 4242`)
4. Check that credits are added to your account

## 🎯 **What This Gives You**

### **For Users:**
- ✅ **Seamless upgrades** with Stripe Checkout
- ✅ **Instant credit delivery** after payment
- ✅ **Bonus credits** when upgrading
- ✅ **Secure payments** with Stripe

### **For You:**
- ✅ **95%+ profit margins** on all plans
- ✅ **Automatic subscription management**
- ✅ **Real-time webhook updates**
- ✅ **No custom payment code needed**

## 📊 **Expected Revenue**

Based on your pricing:
- **Free users**: Cost you ~$0.60/month each
- **Premium users**: $15 revenue - $0.30 cost = **$14.70 profit**
- **Pro users**: $20 revenue - $0.60 cost = **$19.40 profit**
- **Credit packs**: 99% profit margins

## 🔧 **Troubleshooting**

**Webhook not working?**
- Check the webhook URL is correct
- Verify the signing secret matches
- Check your server logs for errors

**Payments not processing?**
- Verify your Stripe keys are correct
- Check that products/prices exist in Stripe
- Test with Stripe test cards

**Credits not being added?**
- Check webhook is receiving events
- Verify Firestore permissions
- Check server logs for errors

## 🚀 **Next Steps**

1. **Test thoroughly** with Stripe test mode
2. **Go live** by switching to live Stripe keys
3. **Monitor** webhook events in Stripe dashboard
4. **Track** revenue and user upgrades

Your billing system is now ready! 🎉
