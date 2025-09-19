# 💳 Credit Configuration Edge Config Migration Guide

## 🛡️ 100% Safe Migration - Nothing Will Break

This guide shows you how to safely migrate your credit system configuration to Edge Config with **zero risk** of breaking anything.

## ✅ What We're Migrating

### **1. AI Credit Costs** (Safe to migrate)
- **Current location**: `types/credits.ts`
- **New location**: Edge Config
- **Fallback**: Original hardcoded values
- **Risk**: **ZERO** - Always falls back to original data

### **2. Subscription Tiers** (Safe to migrate)
- **Current location**: `types/credits.ts`
- **New location**: Edge Config
- **Fallback**: Original hardcoded values
- **Risk**: **ZERO** - Always falls back to original data

## ⚠️ **Important Note About Credit Naming**

**Despite the field name `monthlyCredits`, credits actually refresh DAILY!**

- **Free users**: 15 credits **per day** (not per month)
- **Premium users**: 60 credits **per day** (not per month)
- **Pro users**: 150 credits **per day** (not per month)

The field name is confusing but the system works correctly - users get their full credit allocation refreshed every day at midnight.

## 🔧 Step-by-Step Migration

### **Step 1: Add Credit Configuration to Edge Config**

1. **Go to your Vercel dashboard**
2. **Navigate to your project** → **Storage** → **Edge Config**
3. **Add this comprehensive configuration**:

```json
{
  "coupleAICreditCosts": {
    "draft_messaging": 1,
    "todo_generation": 2,
    "file_analysis": 3,
    "message_analysis": 2,
    "integrated_planning": 5,
    "budget_generation": 3,
    "budget_generation_rag": 5,
    "vibe_generation": 2,
    "bulk_vibe_generation": 5,
    "vendor_suggestions": 2,
    "follow_up_questions": 1,
    "guest_notes_generation": 3,
    "seating_layout_generation": 4,
    "rag_document_processing": 2,
    "rag_query_processing": 3
  },
  "plannerAICreditCosts": {
    "client_communication": 1,
    "vendor_coordination": 2,
    "client_planning": 3,
    "vendor_analysis": 2,
    "client_portal_content": 2,
    "business_analytics": 3,
    "client_onboarding": 2,
    "vendor_contract_review": 3,
    "client_timeline_creation": 4,
    "budget_generation_rag": 5,
    "follow_up_questions": 1,
    "rag_document_processing": 2,
    "rag_query_processing": 3
  },
  "coupleSubscriptionCredits": {
    "free": {
      "dailyCredits": 15,
      "rolloverCredits": 0,
      "aiFeatures": ["draft_messaging", "todo_generation", "file_analysis", "budget_generation", "budget_generation_rag", "vibe_generation", "bulk_vibe_generation"],
      "creditRefresh": "daily",
      "maxVendors": 20,
      "maxContacts": 5,
      "maxBoards": 2,
      "maxFiles": 25
    },
    "premium": {
      "dailyCredits": 60,
      "rolloverCredits": 15,
      "aiFeatures": ["draft_messaging", "todo_generation", "file_analysis", "message_analysis", "vibe_generation", "budget_generation", "budget_generation_rag", "vendor_suggestions", "rag_document_processing", "rag_query_processing"],
      "creditRefresh": "daily",
      "maxVendors": -1,
      "maxContacts": -1,
      "maxBoards": 5,
      "maxFiles": 100
    },
    "pro": {
      "dailyCredits": 150,
      "rolloverCredits": 50,
      "aiFeatures": ["draft_messaging", "todo_generation", "file_analysis", "message_analysis", "integrated_planning", "budget_generation", "budget_generation_rag", "vibe_generation", "vendor_suggestions", "follow_up_questions", "rag_document_processing", "rag_query_processing"],
      "creditRefresh": "daily",
      "maxVendors": -1,
      "maxContacts": -1,
      "maxBoards": 10,
      "maxFiles": 500
    }
  },
  "plannerSubscriptionCredits": {
    "free": {
      "dailyCredits": 25,
      "rolloverCredits": 0,
      "aiFeatures": ["client_communication", "vendor_coordination", "budget_generation_rag"],
      "creditRefresh": "daily",
      "maxClients": 2,
      "maxVendors": 50
    },
    "starter": {
      "dailyCredits": 100,
      "rolloverCredits": 25,
      "aiFeatures": ["client_communication", "vendor_coordination", "client_planning", "vendor_analysis", "budget_generation_rag", "rag_document_processing", "rag_query_processing"],
      "creditRefresh": "daily",
      "maxClients": 5,
      "maxVendors": 200
    },
    "professional": {
      "dailyCredits": 300,
      "rolloverCredits": 100,
      "aiFeatures": ["client_communication", "vendor_coordination", "client_planning", "vendor_analysis", "client_portal_content", "business_analytics", "vendor_contract_review", "budget_generation_rag", "rag_document_processing", "rag_query_processing"],
      "creditRefresh": "daily",
      "maxClients": 15,
      "maxVendors": 1000
    },
    "enterprise": {
      "dailyCredits": 1000,
      "rolloverCredits": 300,
      "aiFeatures": ["client_communication", "vendor_coordination", "client_planning", "vendor_analysis", "client_portal_content", "business_analytics", "client_onboarding", "vendor_contract_review", "client_timeline_creation", "budget_generation_rag", "follow_up_questions", "rag_document_processing", "rag_query_processing"],
      "creditRefresh": "daily",
      "maxClients": 50,
      "maxVendors": -1
    }
  }
}
```

### **Step 2: Test the Migration**

1. **Visit**: `http://localhost:3000/test-credit-config`
2. **You should see**: All credit configurations working with Edge Config
3. **If anything fails**: The app automatically falls back to original data

## 🛡️ Safety Guarantees

### **What Happens If Edge Config Fails:**
- ✅ **App continues working** - Uses original hardcoded values
- ✅ **No errors shown** - Graceful fallback
- ✅ **No data loss** - Original files preserved
- ✅ **Easy rollback** - Can disable anytime

### **What Happens If You Make a Mistake:**
- ✅ **App still works** - Falls back to original values
- ✅ **Easy to fix** - Just update Edge Config
- ✅ **No downtime** - Changes happen instantly

## 🎯 Benefits You'll Get

### **Dynamic Pricing**
- **Instant price changes** without deployments
- **A/B testing** different credit costs
- **Emergency pricing** adjustments
- **Seasonal pricing** updates

### **Performance**
- **Faster loading** - Credit configs served from edge locations
- **Better caching** - Vercel handles caching
- **Lower latency** - Data closer to users

### **Cost Savings**
- **Lower Firestore costs** - Static config data moved to Edge Config
- **Reduced reads** - No more database reads for static configs
- **Better scaling** - Edge Config scales automatically

## 🚀 Advanced Features You Can Enable

### **Dynamic Pricing Experiments**
```json
{
  "coupleAICreditCosts": {
    "draft_messaging": 1,
    "todo_generation": 2,
    "file_analysis": 3,
    "vibe_generation": 1  // Reduced from 2 to 1 for testing
  }
}
```

### **Feature Flagging by Tier**
```json
{
  "coupleSubscriptionCredits": {
    "free": {
      "aiFeatures": ["draft_messaging", "todo_generation"]  // Limited features
    },
    "premium": {
      "aiFeatures": ["draft_messaging", "todo_generation", "file_analysis", "vibe_generation"]  // More features
    }
  }
}
```

### **Emergency Rate Limiting**
```json
{
  "coupleAICreditCosts": {
    "draft_messaging": 5,  // Temporarily increased during high load
    "vibe_generation": 10  // Temporarily increased during high load
  }
}
```

## 📊 Monitoring & Analytics

After migration, you can:
- **Monitor Edge Config usage** in Vercel dashboard
- **Track performance improvements** with faster config loading
- **A/B test pricing** without code changes
- **Implement dynamic pricing** based on usage patterns

## 🔄 Rollback Plan

If you need to rollback:
1. **Remove Edge Config data** (app will use fallbacks)
2. **Or disable Edge Config** in your app
3. **Or update Edge Config** with original values

**The app will continue working normally with original hardcoded values!**
