#!/bin/bash

echo "🔍 Verifying Gmail Push Notifications Pub/Sub Setup..."
echo ""

# Set project
echo "📋 Setting project to paige-ai-db..."
gcloud config set project paige-ai-db
echo ""

# Check if topic exists
echo "✅ Step 1: Checking if topic 'gmail-notifications' exists..."
if gcloud pubsub topics describe gmail-notifications &> /dev/null; then
    echo "   ✓ Topic exists!"
else
    echo "   ✗ Topic NOT found!"
    exit 1
fi
echo ""

# Check topic permissions
echo "✅ Step 2: Checking topic permissions..."
echo "   Looking for gmail-api-push service account..."
gcloud pubsub topics get-iam-policy gmail-notifications
echo ""

# List subscriptions
echo "✅ Step 3: Listing subscriptions..."
gcloud pubsub subscriptions list --filter="topic:gmail-notifications"
echo ""

# Check if webhook subscription exists
echo "✅ Step 4: Checking webhook subscription..."
if gcloud pubsub subscriptions describe gmail-notifications-webhook &> /dev/null; then
    echo "   ✓ Webhook subscription exists!"
    echo ""
    echo "📝 Webhook details:"
    gcloud pubsub subscriptions describe gmail-notifications-webhook
else
    echo "   ⚠️  Webhook subscription NOT found (you'll need to create this for production)"
fi
echo ""

echo "✅ Verification complete!"
