# Email Testing Guide - Real User Flows

## 🎯 What We're Testing

Only **2 real email types** that are actually integrated:

1. **Welcome Email** - Sent after onboarding
2. **Message Notification** - Sent when vendor sends in-app message

---

## ✅ Test 1: Welcome Email

### How to Trigger:
1. Create a test user account (or use existing)
2. Complete the onboarding flow at `/messages` (first time user experience)
3. Fill in wedding details (date, location, venue, etc.)
4. Complete onboarding

### What Happens:
- Email sent automatically after onboarding completion
- Uses real user data from Settings
- Endpoint: `/api/email/trigger-welcome` (called from `app/messages/page.tsx` line 929)

### What to Check:
- ✅ Email arrives at your inbox
- ✅ 80px Paige logo at top (centered)
- ✅ 1rem padding around content
- ✅ 32px Paige favicon in footer
- ✅ "Welcome to Paige! 🎉" header uses Playfair Display
- ✅ Body text uses Work Sans
- ✅ Dynamic content based on your wedding details
- ✅ "Go to Your Dashboard" button uses accent color (#A85C36)
- ✅ Personalized next steps based on what you filled in

### Quick Test Using Existing Endpoint:
```bash
# Test welcome email without going through full onboarding
curl -X POST http://localhost:3000/api/test-welcome-scenarios \
  -H "Content-Type: application/json" \
  -d '{"toEmail":"your-email@gmail.com","scenario":"complete"}'
```

Available scenarios:
- `complete` - All data filled in
- `partial` - Missing venue
- `minimal` - Minimal setup
- `no-partner` - No partner name

---

## ✅ Test 2: Message Notification

### How to Trigger:
1. Go to `/messages` page
2. Send an **in-app message** to a vendor/contact
3. Have the vendor/contact reply via in-app messaging (not Gmail)

### What Happens:
- Email sent when vendor sends message through Paige
- Only for in-app messages (NOT Gmail messages - to avoid duplication)
- Endpoint: `/api/notifications/send` 
- Respects user notification preferences in Settings

### What to Check:
- ✅ Email arrives when in-app message received
- ✅ 80px Paige logo at top (centered)
- ✅ 1rem padding around content
- ✅ 32px Paige favicon in footer
- ✅ "New Message from [Contact Name]" header uses Playfair Display
- ✅ Message preview with italic styling
- ✅ "View & Reply in Paige" button uses accent color
- ✅ NO email for Gmail messages (prevents duplication)

### Quick Test Using Test Endpoint:
```bash
# Test message notification email
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","testType":"email"}'
```

Or go to: **Settings → Notifications → Test Email Notification**

---

## ⚙️ Testing Settings

### Enable Notifications:
1. Go to `/settings`
2. Click "Notifications" tab
3. Ensure "Email Notifications" is checked
4. Click "Save Preferences"

### Test Button in UI:
- Settings → Notifications → "Test" button
- Sends a test email using your current notification settings

---

## 🔍 Debugging

### Check Console Logs:
```bash
# Watch your dev server console for:
✅ Welcome email sent successfully to: user@email.com
✅ Email notification sent successfully to: user@email.com
```

### Common Issues:

**Welcome email not sending:**
- Check if user already has `onboarded: true` in Firestore
- Welcome email only sends once per user
- Check browser console for fetch errors

**Message notification not sending:**
- Verify email notifications are enabled in Settings
- Only works for in-app messages (not Gmail)
- Check if message source is 'inapp' vs 'gmail'

### View Sent Emails:
- Check your email inbox (Gmail, etc.)
- Check spam folder if not in inbox
- SendGrid dashboard shows delivery logs

---

## 📊 What Was Removed

These fake emails were removed (they don't exist in your actual system):
- ❌ Task Assignment Emails (no multi-user task assignment)
- ❌ Vendor Communication Emails (duplicate of message notifications)
- ❌ Milestone Emails (no automated milestone tracking)
- ❌ `/test-all-emails` page (fake test data)

---

## ✨ Summary

**2 Real Emails:**
1. Welcome (after onboarding) - `/api/email/trigger-welcome`
2. Messages (in-app only) - `/api/notifications/send`

**Both now use unified template:**
- 80px header logo
- 1rem padding
- 32px footer logo
- Playfair Display + Work Sans fonts
- Accent color buttons (#A85C36)

**Test both, then we're good to push!** 🚀

