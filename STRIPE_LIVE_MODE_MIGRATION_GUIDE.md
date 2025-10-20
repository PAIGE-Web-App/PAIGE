# 🚀 Stripe Live Mode Migration Guide

**Status**: Ready to migrate from Test Mode → Live Mode  
**Last Updated**: October 20, 2025

---

## ✅ COMPLETED STEPS

- ✅ Updated Product IDs in `lib/stripe.ts` with live mode IDs
- ✅ Updated Price IDs in `lib/stripe.ts` with live mode IDs
- ✅ Centralized price configuration (no hardcoded IDs)
- ✅ Build tested successfully

---

## 📋 WHAT YOU NEED TO DO IN STRIPE DASHBOARD

### **STEP 1: Verify Your Products Exist in Live Mode**

1. Go to https://dashboard.stripe.com
2. **Toggle to "Live mode"** (top right switch)
3. Go to **Products** section
4. Verify these products exist and match your updated IDs:

#### **Subscription Products:**
- **Couple Premium** (`prod_TACr483Jw5gqli`)
  - Price: `price_1SDsRdBd5z9XeQ7SnGFCrWZC` = $15.00/month
  
- **Couple Pro** (`prod_TACrRjSAEZpzfG`)
  - Price: `price_1SDsRlBd5z9XeQ7SgWUw62b4` = $20.00/month
  
- **Planner Starter** (`prod_TACreIfff3DbJd`)
  - Price: `price_1SDsRrBd5z9XeQ7SEGTc9rcO` = $20.00/month
  
- **Planner Professional** (`prod_TACrC9qT7wcomf`)
  - Price: `price_1SDsRxBd5z9XeQ7SwkgFeO8m` = $35.00/month

#### **Credit Pack Products:**
- **12 Credits** (`prod_TACr9zePubyYyM`)
  - Price: `price_1SDsSABd5z9XeQ7SIQB5tH3z` = $2.00
  
- **25 Credits** (`prod_TACrYnlN57K21B`)
  - Price: `price_1SDsSFBd5z9XeQ7SqbInFKxt` = $4.00
  
- **50 Credits** (`prod_TACsUb0jpXxI22`)
  - Price: `price_1SDsSLBd5z9XeQ7SAcjyAvC2` = $7.00
  
- **100 Credits** (`prod_TACsPlBTlUwB0u`)
  - Price: `price_1SDsSRBd5z9XeQ7SgRVJ6CFS` = $12.00
  
- **200 Credits** (`prod_TACs26WQ9a779f`)
  - Price: `price_1SDsSWBd5z9XeQ7SPNK0rvcO` = $20.00

**⚠️ IMPORTANT**: If any product/price ID doesn't exist in Live mode, you need to create it!

---

### **STEP 2: Get Your Live API Keys**

1. In Stripe Dashboard (Live mode)
2. Go to **Developers** → **API keys**
3. Copy these keys (you'll need them for Vercel):

```
Publishable key: pk_live_...
Secret key: sk_live_... (click "Reveal live key")
```

**⚠️ KEEP THESE SAFE - THESE ARE REAL PAYMENT KEYS!**

---

### **STEP 3: Create Live Webhook**

1. In Stripe Dashboard (Live mode)
2. Go to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Configure:
   - **Endpoint URL**: `https://www.weddingpaige.com/api/stripe/webhook`
   - **Events to listen to**:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
5. Click **Add endpoint**
6. **Copy the Signing Secret** (starts with `whsec_`)

---

## 🔧 VERCEL ENVIRONMENT VARIABLES

### **Update in Vercel Dashboard:**

1. Go to https://vercel.com → Your Project → **Settings** → **Environment Variables**
2. Update **ONLY** the **Production** environment:

```env
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET_HERE
```

3. **IMPORTANT**: Keep Test keys for Preview/Development environments!

---

## 💻 LOCAL DEVELOPMENT (.env.local)

### **RECOMMENDED: Keep Test Mode Locally**

Your `.env.local` should stay as TEST mode:

```env
# LOCAL DEVELOPMENT - KEEP AS TEST MODE
STRIPE_SECRET_KEY=sk_test_51SDWol...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SDWol...
STRIPE_WEBHOOK_SECRET=whsec_ajlj...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Why?**
- ✅ No risk of creating real charges during development
- ✅ Can test freely without financial consequences
- ✅ Webhooks work with Stripe CLI for local testing

---

## 🧪 TESTING STRIPE WEBHOOKS (PRODUCTION)

### **After deploying to Vercel:**

1. Make a test purchase in production
2. Check Stripe Dashboard → **Developers** → **Webhooks**
3. Click on your webhook endpoint
4. View **Recent events** to see if webhooks are being received
5. If you see ❌ errors, check the error messages

### **Common Webhook Issues:**

**Issue**: 404 Not Found
- **Fix**: Verify endpoint URL is correct: `https://www.weddingpaige.com/api/stripe/webhook`

**Issue**: Signature verification failed
- **Fix**: Verify webhook secret in Vercel matches Stripe dashboard

**Issue**: No events received
- **Fix**: Verify endpoint is in "Live mode" in Stripe dashboard

---

## 🔒 SECURITY CHECKLIST

Before going live:

- [ ] **Live API keys** are stored in Vercel (Production environment only)
- [ ] **Test API keys** remain in local `.env.local`
- [ ] **Webhook secret** matches Stripe dashboard
- [ ] **Webhook URL** uses HTTPS (not HTTP)
- [ ] **Product/Price IDs** verified in Live mode
- [ ] **No hardcoded test data** in code
- [ ] **Test mode toggle** removed from UI (if any)

---

## 🎯 DEPLOYMENT STEPS

### **Once You Have Live Keys:**

1. **Update Vercel Environment Variables**
   - Add live keys to Production environment
   - Redeploy (or wait for next deployment)

2. **Verify Webhook**
   - Go to Stripe Dashboard → Webhooks
   - Send test webhook to verify it's working

3. **Test Small Transaction**
   - Use a test credit card in **Live mode** (NOT production!)
   - Create a $2 credit pack purchase
   - Verify webhook fires
   - Verify credits are added to user
   - Issue refund immediately

4. **Monitor First Real Transaction**
   - Watch Stripe dashboard during first real purchase
   - Verify webhook received
   - Verify user gets credits/subscription
   - Verify Firestore updated correctly

---

## ⚠️ IMPORTANT WARNINGS

### **🚨 NEVER DO THIS:**
- ❌ Use live keys in `.env.local` (risk of accidental real charges)
- ❌ Commit live API keys to Git
- ❌ Test live payments on production without refunding
- ❌ Use ngrok for live webhooks (use Vercel production URL)

### **✅ ALWAYS DO THIS:**
- ✅ Use test mode locally
- ✅ Use live mode only in Vercel Production
- ✅ Test webhooks with Stripe CLI locally
- ✅ Monitor first few live transactions closely

---

## 🔧 VERCEL REDEPLOY

After updating environment variables in Vercel:

1. Go to **Deployments**
2. Click **...** on latest deployment
3. Click **Redeploy**
4. Select **Use existing Build Cache** for faster deployment

**OR**

Just push a new commit - Vercel will auto-deploy with new env vars!

---

## 📊 VERIFICATION CHECKLIST

After migration, verify:

- [ ] Stripe checkout page loads
- [ ] Payment processes successfully (use test card in live mode first!)
- [ ] Webhook fires and is received
- [ ] User credits/subscription updated in Firestore
- [ ] User sees success message
- [ ] Email sent (if configured)
- [ ] Stripe dashboard shows successful payment

---

## 🆘 TROUBLESHOOTING

### **Checkout Page Not Loading:**
- Check browser console for errors
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set in Vercel
- Verify price IDs exist in Live mode

### **Webhook Not Firing:**
- Check Stripe Dashboard → Webhooks → Recent events
- Verify endpoint URL is correct
- Verify events are selected
- Check Vercel logs for incoming requests

### **Credits Not Added:**
- Check webhook received in Stripe dashboard
- Check Vercel function logs
- Verify `STRIPE_WEBHOOK_SECRET` matches dashboard
- Check Firestore for updated user document

---

## 📝 NEXT STEPS

1. ✅ Get your live API keys from Stripe Dashboard
2. ✅ Create live webhook endpoint
3. ✅ Update Vercel environment variables
4. ✅ Redeploy or push new commit
5. ✅ Test with small transaction
6. ✅ Monitor and verify everything works

---

## 🎊 YOU'RE READY!

Your code is already configured for live mode. You just need to:
1. Get the live keys from Stripe
2. Update Vercel environment variables
3. Deploy and test!

**Good luck with your first live transaction!** 🚀

