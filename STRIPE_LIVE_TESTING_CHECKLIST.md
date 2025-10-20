# 🧪 Stripe Live Mode Testing Checklist

**Date**: October 20, 2025  
**Status**: Ready for live payment testing  
**Environment**: Production (www.weddingpaige.com)

---

## ✅ PRE-TESTING VERIFICATION

### **Confirmed Setup:**
- ✅ Live Product IDs updated in `lib/stripe.ts`
- ✅ Live Price IDs updated in `lib/stripe.ts`
- ✅ Centralized configuration (no hardcoded IDs)
- ✅ Vercel Production env vars updated with live keys
- ✅ Webhook endpoint accessible: `https://www.weddingpaige.com/api/stripe/webhook`
- ✅ Build tested and passing

---

## 🧪 TESTING PROCEDURE

### **TEST 1: Small Credit Pack ($2.00 - Lowest Risk)**

#### **Before Testing:**
1. Open Stripe Dashboard (Live mode)
2. Go to **Payments** → ready to monitor
3. Go to **Developers** → **Webhooks** → Your webhook endpoint
4. Keep this tab open to watch webhook events

#### **During Test:**
1. Go to https://www.weddingpaige.com/settings (tab: Plan)
2. Click on **12 Credits** pack ($2.00)
3. Click "Buy Credits with Paige"
4. You'll be redirected to Stripe Checkout
5. **IMPORTANT**: Use a REAL payment method OR Stripe test card in live mode:

**Option A: Test Card in Live Mode (RECOMMENDED)**
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```
**Note**: This creates a real-looking transaction but Stripe won't actually charge!

**Option B: Real Card (Use Your Own)**
- Use a real card (will create real charge)
- Plan to refund immediately after testing

6. Complete the checkout
7. You should be redirected to `/settings?tab=plan&success=true&type=credits`

#### **After Test - Verify:**
- [ ] **Stripe Dashboard**: Payment shows in Payments section
- [ ] **Stripe Webhooks**: `checkout.session.completed` event received (green checkmark)
- [ ] **Your App**: User's credit balance increased by 12
- [ ] **Firestore**: User document updated with new credits
- [ ] **Success Message**: User sees success toast/message
- [ ] **Vercel Logs**: No errors in function logs

#### **If Using Real Card:**
- [ ] Go to Stripe Dashboard → Payments
- [ ] Find the $2.00 payment
- [ ] Click **Refund** → Refund full amount
- [ ] Verify refund processed

---

### **TEST 2: Subscription ($15/month - More Complex)**

⚠️ **ONLY DO THIS AFTER TEST 1 SUCCEEDS!**

#### **Before Testing:**
1. Ensure Test 1 passed all checks
2. Open Stripe Dashboard → **Subscriptions**
3. Ready to monitor

#### **During Test:**
1. Go to https://www.weddingpaige.com/settings (tab: Plan)
2. Click **Upgrade to Premium** (Couple Premium - $15/month)
3. Complete checkout (same card as Test 1)
4. Redirected to `/settings?tab=plan&success=true&type=subscription`

#### **After Test - Verify:**
- [ ] **Stripe Dashboard**: Subscription created
- [ ] **Stripe Webhooks**: 
  - [ ] `checkout.session.completed` received
  - [ ] `customer.subscription.created` received
  - [ ] `invoice.payment_succeeded` received
- [ ] **Your App**: User's subscription tier updated to "premium"
- [ ] **Your App**: User's daily credits = 22
- [ ] **Your App**: User received 60 bonus credits
- [ ] **Firestore**: User document has subscription data
- [ ] **No Errors**: Check Vercel logs

#### **If Using Real Card:**
- [ ] Cancel subscription immediately in Stripe Dashboard
- [ ] Go to Subscriptions → Find subscription → Cancel
- [ ] Verify cancellation webhook fires
- [ ] Verify user downgraded in your app

---

### **TEST 3: Webhook Manual Test (Stripe Dashboard)**

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **Send test webhook**
4. Select event type: `checkout.session.completed`
5. Click **Send test webhook**
6. Verify:
   - [ ] Webhook shows as "Succeeded" in dashboard
   - [ ] Check Vercel logs for incoming webhook
   - [ ] No errors in processing

---

## 🚨 TROUBLESHOOTING

### **Issue: "Invalid API Key"**
**Cause**: Vercel env vars not updated or not deployed  
**Fix**: 
1. Check Vercel → Settings → Environment Variables
2. Verify `STRIPE_SECRET_KEY=sk_live_...` for Production
3. Redeploy

### **Issue: "No such product" or "No such price"**
**Cause**: Product/Price IDs in code don't exist in Live mode  
**Fix**:
1. Go to Stripe Dashboard → Products
2. Verify product IDs match `lib/stripe.ts`
3. If not, update code or create products

### **Issue: Webhook not received**
**Cause**: Webhook endpoint not configured or wrong secret  
**Fix**:
1. Verify webhook URL: `https://www.weddingpaige.com/api/stripe/webhook`
2. Verify webhook secret in Vercel matches Stripe dashboard
3. Check webhook is in "Live mode" not "Test mode"

### **Issue: "Signature verification failed"**
**Cause**: Wrong webhook secret in Vercel  
**Fix**:
1. Get signing secret from Stripe Dashboard → Webhooks → Your endpoint
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel
3. Redeploy

### **Issue: Credits not added to user**
**Cause**: Webhook received but processing failed  
**Fix**:
1. Check Vercel function logs
2. Look for errors in webhook handler
3. Check Firestore permissions
4. Verify user ID mapping

---

## 📊 MONITORING CHECKLIST

### **During First Live Transaction:**

**Watch These Locations:**
1. **Stripe Dashboard** → Payments (real-time)
2. **Stripe Dashboard** → Webhooks → Recent events
3. **Vercel Dashboard** → Functions → Real-time logs
4. **Your App** → User's credit balance
5. **Firebase Console** → Firestore → User document

### **Expected Timeline:**
```
1. User clicks "Buy Credits" → 0s
2. Redirected to Stripe checkout → 1s
3. User enters card details → 30s
4. Payment processed → 32s
5. Webhook fired by Stripe → 33s
6. Your API receives webhook → 34s
7. Credits added to Firestore → 35s
8. User redirected back → 36s
9. User sees updated credits → 37s
```

---

## ✅ SUCCESS CRITERIA

### **Subscription Purchase Success:**
- [ ] User charged correct amount
- [ ] Subscription created in Stripe
- [ ] All 3 webhooks received (checkout, subscription, invoice)
- [ ] User tier updated in Firestore
- [ ] Daily credits = 22
- [ ] Bonus credits = 60 added
- [ ] User sees "Premium" badge
- [ ] Recurring billing scheduled for next month

### **Credit Pack Purchase Success:**
- [ ] User charged correct amount
- [ ] Payment shows in Stripe
- [ ] 1 webhook received (checkout.session.completed)
- [ ] Credits added to user balance
- [ ] User sees updated credit count
- [ ] Transaction recorded in Firestore

---

## 🎯 RECOMMENDED TESTING ORDER

1. ✅ **Start with Test Card** (no real charge)
   - Verify entire flow works
   - Check webhooks fire
   - Check credits added
   
2. ✅ **Then Real Small Transaction** (if test card succeeds)
   - $2 credit pack
   - Refund immediately
   - Verify refund works

3. ✅ **Then Subscription** (if credit pack succeeds)
   - $15/month subscription
   - Cancel immediately
   - Verify cancellation works

---

## 📞 SUPPORT RESOURCES

### **If You Need Help:**

**Stripe Support:**
- Dashboard → Help → Contact support
- Or: support@stripe.com

**Common Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`
- More: https://stripe.com/docs/testing

**Webhook Testing:**
- Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Dashboard test webhooks: Developers → Webhooks → Send test webhook

---

## 🎊 YOU'RE READY!

**Current Status:**
- ✅ Code updated and deployed
- ✅ Live keys added to Vercel
- ✅ Webhook endpoint created
- ✅ Ready for testing

**Next Step:**
1. Wait for Vercel to redeploy (or trigger redeploy)
2. Test with test card first
3. Then decide if you want real transaction

**Good luck! 🚀**

