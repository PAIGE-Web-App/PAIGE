# 🔔 Google Cloud Pub/Sub Setup Guide for Gmail Push Notifications

## 🎯 **Overview**

This guide will help you set up Google Cloud Pub/Sub to receive Gmail push notifications. We'll use the **simplest and most cost-effective approach** for your production app.

---

## ✅ **Step 1: Access Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project: **`paige-ai-db`**
3. Make sure you're signed in with the Google account that owns this project

---

## ✅ **Step 2: Enable Required APIs**

### **Enable Gmail API** (if not already enabled)
1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Enable** if it's not already enabled

### **Enable Pub/Sub API**
1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Cloud Pub/Sub API"
3. Click **Enable**

---

## ✅ **Step 3: Create the Pub/Sub Topic**

### **Option A: Using Google Cloud Console (Easiest)**

1. **Navigate to Pub/Sub**:
   - In Google Cloud Console, open the menu (☰)
   - Go to **Pub/Sub** → **Topics**
   - Click **CREATE TOPIC**

2. **Configure the Topic**:
   - **Topic ID**: `gmail-notifications`
   - **Encryption**: Leave as default (Google-managed key)
   - **Add a default subscription**: ✅ **Check this box**
   - **Subscription ID**: `gmail-notifications-sub`
   - Click **CREATE**

3. **Grant Gmail Permission**:
   - In the topic details page, click **PERMISSIONS** tab
   - Click **GRANT ACCESS**
   - **New principals**: `serviceAccount:gmail-api-push@system.gserviceaccount.com`
   - **Role**: Select **Pub/Sub Publisher**
   - Click **SAVE**

### **Option B: Using gcloud CLI (For Terminal Users)**

```bash
# 1. Set your project
gcloud config set project paige-ai-db

# 2. Create the Pub/Sub topic
gcloud pubsub topics create gmail-notifications

# 3. Create a subscription
gcloud pubsub subscriptions create gmail-notifications-sub \
  --topic=gmail-notifications

# 4. Grant Gmail API permission to publish to the topic
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

---

## ✅ **Step 4: Create Push Subscription for Your Webhook**

This configures Pub/Sub to automatically send notifications to your webhook endpoint.

### **Using Google Cloud Console**:

1. **Navigate to Subscriptions**:
   - Go to **Pub/Sub** → **Subscriptions**
   - Click **CREATE SUBSCRIPTION**

2. **Configure the Push Subscription**:
   - **Subscription ID**: `gmail-notifications-webhook`
   - **Select a Cloud Pub/Sub topic**: `gmail-notifications`
   - **Delivery type**: Select **Push**
   - **Endpoint URL**: 
     ```
     https://your-production-domain.com/api/webhooks/gmail-push-notifications
     ```
     ⚠️ Replace with your actual production URL (e.g., `https://paige.app/api/webhooks/gmail-push-notifications`)
   
3. **Advanced Settings** (Optional but Recommended):
   - **Acknowledgement deadline**: 60 seconds
   - **Message retention duration**: 7 days
   - **Retry policy**: Exponential backoff
   - **Minimum backoff**: 10 seconds
   - **Maximum backoff**: 600 seconds

4. Click **CREATE**

### **Using gcloud CLI**:

```bash
# Create push subscription
gcloud pubsub subscriptions create gmail-notifications-webhook \
  --topic=gmail-notifications \
  --push-endpoint=https://your-production-domain.com/api/webhooks/gmail-push-notifications \
  --ack-deadline=60
```

---

## ✅ **Step 5: Verify Your Setup**

### **Check Topic Permissions**:
```bash
# View topic permissions
gcloud pubsub topics get-iam-policy gmail-notifications
```

You should see:
```yaml
bindings:
- members:
  - serviceAccount:gmail-api-push@system.gserviceaccount.com
  role: roles/pubsub.publisher
```

### **Check Subscription**:
```bash
# List subscriptions
gcloud pubsub subscriptions list
```

You should see both:
- `gmail-notifications-sub` (pull subscription for monitoring)
- `gmail-notifications-webhook` (push subscription for your app)

---

## ✅ **Step 6: Test the Setup**

### **1. Enable Gmail Push Notifications in Your App**:
1. Go to your app: Settings → Integrations
2. Click **Enable** under Gmail Push Notifications
3. Check for success message

### **2. Send a Test Email**:
1. Send yourself an email from a contact you have in Paige
2. Check if a todo suggestion is created
3. Monitor your webhook logs

### **3. Monitor Pub/Sub Activity**:
In Google Cloud Console:
- Go to **Pub/Sub** → **Topics** → `gmail-notifications`
- Click **METRICS** to see message throughput
- Check **Subscriptions** to see delivery status

---

## 🔍 **Monitoring & Debugging**

### **View Pub/Sub Messages** (for debugging):
```bash
# Pull messages from the subscription
gcloud pubsub subscriptions pull gmail-notifications-sub \
  --auto-ack --limit=10
```

### **Check Delivery Errors**:
1. In Google Cloud Console: **Pub/Sub** → **Subscriptions**
2. Click on `gmail-notifications-webhook`
3. View **Delivery attempts** and **Dead letter topic** (if configured)

### **Webhook Logs**:
Monitor your Next.js application logs for:
```
Gmail Push Notification: Received webhook
Gmail Push Notification: Processing for user: {userId}
Gmail Push Notification: Successfully processed {count} messages
```

---

## 💰 **Cost Considerations**

### **Pub/Sub Pricing** (Very Affordable):
- **First 10GB per month**: FREE
- **After 10GB**: $40 per TB
- **Typical usage**: ~100 emails/day = ~1MB/day = $0.00/month

### **Gmail API Quotas**:
- **Push notifications**: FREE (no quota)
- **History API calls**: 1,000,000,000 per day (effectively unlimited for your use case)

---

## 🚨 **Troubleshooting**

### **Issue: "Permission denied" when setting up watch**
**Solution**: Make sure Gmail API has permission to publish to your topic:
```bash
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

### **Issue: "Topic not found"**
**Solution**: Ensure topic name matches exactly:
- Topic must be: `gmail-notifications`
- Project must be: `paige-ai-db`
- Full topic path: `projects/paige-ai-db/topics/gmail-notifications`

### **Issue: Webhook not receiving messages**
**Solutions**:
1. Verify webhook endpoint is publicly accessible
2. Check webhook URL is correct in subscription
3. Ensure subscription is configured as **Push** (not Pull)
4. Check your app's webhook endpoint logs

### **Issue: "Watch already exists"**
**Solution**: This is normal if you've already set up push notifications. Gmail allows one watch per user.

---

## 🎉 **Setup Complete!**

Once you've completed these steps, your Gmail push notifications system is fully operational!

### **What Happens Next**:
1. ✅ Users enable push notifications in Settings
2. ✅ Gmail sends notifications to your Pub/Sub topic
3. ✅ Pub/Sub forwards to your webhook endpoint
4. ✅ Your app processes notifications and creates todo suggestions
5. ✅ Users see automatic todo suggestions from emails

---

## 📚 **Additional Resources**

- [Gmail Push Notifications Documentation](https://developers.google.com/gmail/api/guides/push)
- [Cloud Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
- [Firebase Project Console](https://console.firebase.google.com/project/paige-ai-db)
- [Google Cloud Console](https://console.cloud.google.com/welcome?project=paige-ai-db)

---

## 🔐 **Security Notes**

- ✅ Pub/Sub topic is private to your GCP project
- ✅ Gmail API has exclusive permission to publish
- ✅ Webhook endpoint validates message format
- ✅ OAuth tokens stored securely in Firestore
- ✅ Each user's watch is isolated and secure

Your Gmail push notifications system is production-ready and secure! 🚀
