# Recommended Email System for Paige

Based on deep analysis of the actual system implementation, here are the emails that make sense:

## ✅ Currently Implemented & Working

### 1. Welcome Email
**Trigger**: After user completes `/onboarding` flow  
**File**: `app/messages/page.tsx` (line 927-937)  
**API**: `/api/email/trigger-welcome`  
**Status**: ✅ Fully integrated with real user data

### 2. In-App Message Notifications
**Trigger**: When vendor sends message through Paige (not Gmail)  
**File**: `/api/notifications/send`  
**Function**: `sendNotificationEmail` in `lib/emailService.ts`  
**Status**: ✅ Already working, respects user preferences

### 3. Credit Alerts (needs update)
**Current**: Sends alerts at arbitrary thresholds  
**Recommended**: Only send when user tries to use AI with 0 credits  
**Why**: Credits auto-refresh monthly, users check in-app  
**Status**: ⚠️ Needs refactoring

---

## ❌ Should Remove

### Task Assignment Emails
**Why Remove**:
- No multi-user task assignment in system
- Todos are personal planning, not collaborative
- `/api/notifications/todo` exists but is never called
- Would require fake data to test

### Vendor Communication Emails  
**Why Remove**:
- Already covered by message notifications
- Would be duplicate alerts

### Milestone Emails
**Why Remove**:
- No automated milestone tracking
- Would require cron jobs that don't exist
- Not part of current product vision

---

## 🚀 Recommended Implementation

### Keep These 3 Email Types:

1. **Welcome Email** (dynamic, personalized)
   - Already perfect ✅
   
2. **Message Notifications** (vendor messages)
   - Already working ✅
   - Update to use new unified template

3. **Credit Depleted Alert** (contextual help)
   - Only when user hits 0 credits during AI action
   - Include link to upgrade subscription
   - Show which feature they tried to use

### Testing Strategy:

Instead of fake test endpoints, test using real flows:
- Welcome: Complete onboarding
- Messages: Send in-app message from vendor
- Credits: Deplete credits and try AI feature

---

## 📊 What This Means

**Total Email Types**: 3 (not 6+)  
**All use real data**: Yes  
**All integrated into actual flows**: Yes  
**Need fake test endpoints**: No  

This is a focused, high-quality email system that serves real user needs without notification fatigue.

