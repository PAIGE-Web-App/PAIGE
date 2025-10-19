# Stripe Webhook Setup Guide

## 🎯 **Production Webhook Configuration**

### **Step 1: Configure Stripe Webhook**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Set **Endpoint URL** to: `https://www.weddingpaige.com/api/stripe/webhook`
4. Select these **Events**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`

### **Step 2: Get Webhook Secret**

1. After creating the webhook, click on it
2. Copy the **"Signing secret"** (starts with `whsec_`)
3. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

### **Step 3: Test Webhook**

1. Make a test subscription change
2. Check Stripe webhook logs for delivery status
3. Check Vercel function logs for processing status

## 🔧 **Environment Variables Required**

Make sure these are set in Vercel:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

## 🚨 **Fallback Mechanism**

If webhooks fail, users can manually refresh credits using the "Refresh Credits" button in Settings → Plan & Billing.

## 📊 **Webhook Events Handled**

- **checkout.session.completed**: Credit pack purchases
- **customer.subscription.created**: New subscriptions
- **customer.subscription.updated**: Plan changes
- **customer.subscription.deleted**: Cancellations
- **invoice.payment_succeeded**: Payment confirmations
