# 🚀 Gmail Push Notifications - Quick Start (5 Minutes)

## **TL;DR - Fastest Setup**

Follow these 5 steps to enable Gmail push notifications:

---

## **Step 1: Open Google Cloud Console** (1 min)

1. Go to: [console.cloud.google.com](https://console.cloud.google.com/)
2. Select project: **`paige-ai-db`**

---

## **Step 2: Enable Pub/Sub API** (30 seconds)

1. Search for "Cloud Pub/Sub API" in the search bar
2. Click **Enable** (if not already enabled)

---

## **Step 3: Create Pub/Sub Topic** (2 min)

### **Using Console (Click-through)**:

1. **Navigate**: Menu (☰) → Pub/Sub → Topics
2. **Click**: CREATE TOPIC
3. **Enter**:
   - Topic ID: `gmail-notifications`
   - ✅ Check "Add a default subscription"
   - Subscription ID: `gmail-notifications-sub`
4. **Click**: CREATE

### **OR Using Terminal (Copy-Paste)**:

```bash
# Set project
gcloud config set project paige-ai-db

# Create topic
gcloud pubsub topics create gmail-notifications

# Create subscription
gcloud pubsub subscriptions create gmail-notifications-sub --topic=gmail-notifications
```

---

## **Step 4: Grant Gmail Permission** (1 min)

### **Using Console**:

1. Click on the `gmail-notifications` topic
2. Go to **PERMISSIONS** tab
3. Click **GRANT ACCESS**
4. Enter:
   - **New principals**: `serviceAccount:gmail-api-push@system.gserviceaccount.com`
   - **Role**: Pub/Sub Publisher
5. Click **SAVE**

### **OR Using Terminal**:

```bash
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

---

## **Step 5: Create Webhook Subscription** (1 min)

### **Using Console**:

1. Go to: Pub/Sub → Subscriptions → CREATE SUBSCRIPTION
2. Enter:
   - **Subscription ID**: `gmail-notifications-webhook`
   - **Topic**: `gmail-notifications`
   - **Delivery type**: **Push**
   - **Endpoint URL**: `https://YOUR-DOMAIN.com/api/webhooks/gmail-push-notifications`
     - Replace `YOUR-DOMAIN.com` with your actual production domain
     - Example: `https://paige.app/api/webhooks/gmail-push-notifications`
3. Click **CREATE**

### **OR Using Terminal**:

```bash
# Replace YOUR-DOMAIN.com with your actual domain
gcloud pubsub subscriptions create gmail-notifications-webhook \
  --topic=gmail-notifications \
  --push-endpoint=https://YOUR-DOMAIN.com/api/webhooks/gmail-push-notifications \
  --ack-deadline=60
```

---

## **✅ Done! Test It**

1. **In Your App**:
   - Go to Settings → Integrations
   - Click **Enable** under Gmail Push Notifications
   - You should see "Active" status

2. **Send Test Email**:
   - Send yourself an email from a contact in Paige
   - Check if a todo suggestion appears

3. **Verify in Console**:
   - Go to Pub/Sub → Topics → `gmail-notifications` → METRICS
   - You should see message throughput

---

## **🔧 Verification Checklist**

- ✅ Pub/Sub API is enabled
- ✅ Topic `gmail-notifications` exists
- ✅ Gmail service account has Publisher role
- ✅ Webhook subscription points to your production URL
- ✅ Gmail push notifications show "Active" in Settings

---

## **💡 Pro Tips**

1. **For Development**: Test with a single user first before rolling out
2. **Monitoring**: Check Pub/Sub metrics to see message flow
3. **Cost**: First 10GB/month is FREE (you'll likely never exceed this)
4. **Watch Expiration**: Gmail watches expire after 7 days - system auto-renews

---

## **🚨 Common Issues**

### **"Permission denied" error**
**Fix**: Run the Gmail permission grant command again (Step 4)

### **No messages arriving**
**Fix**: Double-check your webhook URL is correct and publicly accessible

### **"Topic not found"**
**Fix**: Ensure topic name is exactly `gmail-notifications` (no typos)

---

## **🎉 That's It!**

Your Gmail push notifications are now live! Users can enable them in Settings → Integrations.

**Need more details?** See the full guide: `PUBSUB_SETUP_GUIDE.md`

**Questions?** Check the troubleshooting section in the full guide.
