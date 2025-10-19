# 🧪 Todo Suggestions Hybrid System - Testing Guide

## 🎯 WHAT WE'RE TESTING

1. ✅ Background auto-check stores suggestions silently
2. ✅ Purple badges appear on sidebar
3. ✅ Review banner appears when opening contact
4. ✅ Manual checks still show modal immediately (backward compatibility)
5. ✅ No breaking changes to existing flows

---

## 📋 PRE-TESTING CHECKLIST

### **Setup Requirements:**
- [  ] You're logged into your Paige account
- [  ] You have at least 2 contacts with email addresses
- [  ] Gmail is connected (Settings → Integrations)
- [  ] At least one contact has `gmailImported: true` (has been imported before)

### **How to Verify Gmail is Connected:**
1. Go to `/settings`
2. Click "Integrations" tab
3. Should show: "Gmail: Import contacts, send messages" with green checkmark
4. Should display your connected Gmail email

### **How to Find a Contact with Imported Gmail:**
1. Go to `/messages`
2. Click on a contact
3. If you see "Check for New Emails" in the dropdown → This contact has been imported

---

## 🧪 TEST SCENARIOS

---

### **TEST 1: Background Auto-Check (Core New Feature)**

#### **Objective:** Verify auto-check stores suggestions silently without modal spam

#### **Steps:**
1. **Open browser console** (Cmd+Option+J on Mac, F12 on Windows)
2. Go to `/messages` page
3. Click on a contact that has `gmailImported: true`
4. **Watch console for:**
   ```
   [AUTO-CHECK] Background check complete: X suggestions stored
   ```

#### **Expected Behavior:**
- ✅ Console shows background check ran
- ✅ **NO modal appears** (this is key!)
- ✅ If suggestions found, purple badge appears on sidebar next to contact name
- ✅ If no suggestions, no badge (normal)

#### **What the Purple Badge Looks Like:**
```
Photographer  [2]  ← Red badge (unread messages)
              [3]  ← Purple badge (#805d93) - todo suggestions
```

#### **If Badge Appears:**
- ✅ Hover over purple badge → Tooltip: "3 action item(s) found in emails"
- ✅ Banner appears above messages: "🤖 Paige analyzed X recent emails..."

#### **Troubleshooting:**
- **Badge doesn't appear:** Contact might not have new emails with actionable content
- **Console error:** Check if Gmail access token is valid
- **No auto-check runs:** Contact might not have `gmailImported: true`

---

### **TEST 2: Review Banner & Modal**

#### **Objective:** Verify banner shows and opens modal correctly

#### **Pre-requisite:** Contact must have purple badge (from Test 1)

#### **Steps:**
1. Click on a contact with purple badge
2. **Look for banner** above the message thread

#### **Expected Banner:**
```
┌──────────────────────────────────────────────────────────┐
│ 🤖 Paige analyzed X recent emails and found Y action    │
│    items                                                  │
│                                                           │
│ Review these suggestions and add them to your to-do      │
│ lists with one click.                                    │
│                                                           │
│ [Review & Add]  [Dismiss]                                │
└──────────────────────────────────────────────────────────┘
```

#### **Test Action 1: Click "Review & Add"**
- ✅ `GmailTodoReviewModal` appears
- ✅ Shows list of suggested todos with checkboxes
- ✅ All todos checked by default
- ✅ Can uncheck individual todos
- ✅ Click "Add Selected" → Todos created
- ✅ Modal closes
- ✅ **Purple badge disappears from sidebar**
- ✅ Banner disappears
- ✅ Success toast: "Applied X todo changes!"

#### **Test Action 2: Click "Dismiss"** (use different contact)
- ✅ Banner disappears immediately
- ✅ **Purple badge disappears from sidebar**
- ✅ No modal appears
- ✅ Suggestions marked as dismissed in Firestore

---

### **TEST 3: Manual "Check for New Emails" (Backward Compatibility)**

#### **Objective:** Verify manual checks still show modal immediately (legacy behavior)

#### **Steps:**
1. Click on a contact with Gmail imported
2. Click the **three-dot dropdown** next to contact name
3. Click **"Check for New Emails"**
4. Wait for check to complete

#### **Expected Behavior:**
- ✅ Loading spinner appears on button
- ✅ If new emails found: Toast "X new Gmail message(s) imported!"
- ✅ **Modal appears immediately** showing todo suggestions
- ✅ No purple badge appears (suggestions shown in modal, not stored)
- ✅ User reviews and accepts/rejects right away
- ✅ **This is the OLD behavior preserved**

#### **Expected Toast Messages:**
- **New emails with todos:** "2 new Gmail message(s) imported!" + Modal opens
- **New emails, no todos:** "2 new Gmail message(s) imported!" + No modal
- **No new emails:** "No new Gmail messages found."

---

### **TEST 4: Re-import Emails (Unchanged Legacy Flow)**

#### **Objective:** Verify full re-import still works with modal

#### **Steps:**
1. Click on a contact
2. Click dropdown → **"Re-import Emails"**
3. Configuration modal appears
4. Click **"Import"** (or configure and import)

#### **Expected Behavior:**
- ✅ Configuration modal appears (if first time or re-import)
- ✅ Import starts
- ✅ Loading modal shows: "Analyzing emails for action items..."
- ✅ **GmailTodoReviewModal appears** with all suggestions
- ✅ User can review and accept/reject
- ✅ **Exactly the same as before** (zero changes)

---

### **TEST 5: Multiple Contacts with Suggestions**

#### **Objective:** Verify system handles multiple contacts correctly

#### **Setup:**
1. Have at least 3 contacts with `gmailImported: true`
2. Ideally, contacts that have received emails recently

#### **Steps:**
1. Go to `/messages` page
2. Click **Contact A** → Wait for auto-check
3. Click **Contact B** → Wait for auto-check  
4. Click **Contact C** → Wait for auto-check
5. Look at sidebar

#### **Expected Behavior:**
- ✅ Each contact that has suggestions shows **separate purple badge**
- ✅ Badges show different counts (e.g., [2], [3], [1])
- ✅ Each contact's banner shows their specific count
- ✅ Reviewing Contact A doesn't affect Contact B's badge
- ✅ Can review contacts in any order

#### **Visual Check:**
```
Sidebar should look like:
┌─────────────────────────────┐
│ Photographer     [●] [2]   │ ← Red + Purple
│ Caterer          [3]  [3]  │ ← Red + Purple
│ Florist               [1]  │ ← Purple only
│ DJ                    [5]  │ ← Red only
└─────────────────────────────┘
```

---

### **TEST 6: Dismiss and Re-Check**

#### **Objective:** Verify dismissed suggestions can be re-analyzed if user wants

#### **Steps:**
1. Click contact with purple badge
2. Click **"Dismiss"** on banner
3. Verify badge disappears
4. Click dropdown → **"Check for New Emails"**

#### **Expected Behavior:**
- ✅ Dismiss → Badge disappears
- ✅ Manual check → New analysis runs
- ✅ If same emails have actionable content, **new suggestions** appear in modal
- ✅ User can review again
- ✅ Proves user always has control

---

### **TEST 7: Verify No Breaking Changes**

#### **Objective:** Ensure existing functionality unchanged

#### **Things to Verify:**
- [  ] Sending messages still works
- [  ] Receiving messages still works
- [  ] Adding new contacts still works
- [  ] Deleting messages still works
- [  ] Gmail import configuration modal still works
- [  ] Todo review modal accept/reject still works
- [  ] Unread message badges (red) still work
- [  ] Contact switching is smooth (no lag)

---

## 🔍 DEBUGGING TIPS

### **If Purple Badge Doesn't Appear:**

**Check 1: Are new emails being imported?**
```javascript
// In console, check:
console.log('Contact has new messages?')
```
- Open contact → Check if new messages appear in thread

**Check 2: Do emails have actionable content?**
- Emails must contain keywords like:
  - "please", "confirm", "deadline", "payment", "$", "invoice"
- Email body must be > 50 characters
- Auto-replies and spam are filtered out

**Check 3: Check Firestore directly:**
1. Go to Firebase Console → Firestore
2. Navigate to: `users/{yourUserId}/contacts/{contactId}`
3. Look for `pendingTodoSuggestions` field
4. Should have: `{ count: X, status: 'pending', suggestions: [...] }`

**Check 4: Check console logs:**
```
Look for:
[TODO SUGGESTIONS] Stored X suggestions for contact {contactId}
[AUTO-CHECK] Background check complete: X suggestions stored
```

### **If Banner Doesn't Appear:**

**Check 1: Is status 'pending'?**
- In Firestore, `pendingTodoSuggestions.status` must be `'pending'`
- If `'reviewed'` or `'dismissed'`, banner won't show

**Check 2: Refresh contact:**
- Click away to different contact
- Click back to the contact with badge
- Banner should appear

### **If Modal Doesn't Open When Clicking "Review & Add":**

**Check console for errors:**
```javascript
Error opening modal: ...
```

**Verify:**
- `pendingSuggestions` state has data
- `setShowGmailTodoReview(true)` is being called
- `GmailTodoReviewModal` component is rendering

---

## 🎯 ACCEPTANCE CRITERIA

**For the feature to be considered working:**

- [  ] ✅ Background auto-check runs silently (no modal spam)
- [  ] ✅ Purple badges appear when suggestions exist
- [  ] ✅ Banner shows correct count of suggestions
- [  ] ✅ "Review & Add" opens modal with suggestions
- [  ] ✅ Accepting suggestions creates todos
- [  ] ✅ Purple badge disappears after review
- [  ] ✅ "Dismiss" removes badge and banner
- [  ] ✅ Manual "Check for New" still shows modal immediately
- [  ] ✅ Multiple contacts each show their own badges
- [  ] ✅ No breaking changes to existing functionality

---

## 📸 SCREENSHOTS TO CAPTURE FOR DEMO

1. **Sidebar with purple badges** on multiple contacts
2. **Banner showing action items count**
3. **Modal with todo suggestions** and checkboxes
4. **Badge disappearing** after review (before/after)
5. **Settings page** showing Gmail data controls

---

## 🐛 COMMON ISSUES & FIXES

### **Issue: "No actionable content found"**
**Cause:** Email doesn't contain action keywords  
**Fix:** This is intentional - we only suggest todos for emails with clear action items

### **Issue: Badge appears but shows [0]**
**Cause:** Suggestions were created but all dismissed/reviewed  
**Fix:** Click "Check for New Emails" to re-analyze

### **Issue: Multiple badges for same contact**
**Cause:** Not possible - each contact can only have one purple badge  
**Fix:** If you see this, it's a bug - let me know!

### **Issue: Banner stays after clicking "Review & Add"**
**Cause:** Modal might have failed to open  
**Fix:** Check console for errors, try refreshing page

---

## 🚀 NEXT STEPS AFTER TESTING

Once you verify everything works:

1. **Test with real vendor emails** (photographer, caterer, etc.)
2. **Verify actionable items are detected** (payments, confirmations, deadlines)
3. **Record demo video** showing the complete flow
4. **Submit to Google** with confidence!

---

## 💡 PRO TIPS FOR DEMO

- **Use real emails:** Import actual vendor emails to show authenticity
- **Show multiple contacts:** Demonstrates scalability
- **Show dismiss option:** Proves user control
- **Show data deletion:** Critical for Google verification
- **Keep it under 3 minutes:** Google reviewers appreciate brevity

---

**Ready to test? Open your app and follow Test 1!** 🎬

