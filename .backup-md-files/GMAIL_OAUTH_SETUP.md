# Gmail OAuth Email Setup Guide

## ✅ Great News! No App Passwords Needed

Your app now uses **Gmail OAuth** for sending email notifications, which is:
- **More secure** than App Passwords
- **Easier to set up** - no need to generate App Passwords
- **Already configured** - uses the same Gmail connection you already have

## How It Works

1. **Users connect their Gmail** during onboarding (you already have this working)
2. **The app stores OAuth tokens** securely in your database
3. **Email notifications are sent** using the user's own Gmail account via Gmail API
4. **No additional setup required** - it just works!

## What You Need to Do

### 1. Make Sure Gmail OAuth is Working
Your app already has Gmail OAuth set up. Users just need to:
1. Go through onboarding
2. Click "Connect Gmail" 
3. Authorize the app to access their Gmail

### 2. Test Email Notifications
Once a user has connected their Gmail:

1. **Go to Settings → Notifications**
2. **Enable "Email Notifications"**
3. **Click "Test Notifications"**
4. **Check your email!** 📧

### 3. Test with Real Messages
1. **Add a contact** with an email address
2. **Send them an in-app message**
3. **You should receive an email notification** about the new message

## Environment Variables

You only need these for Gmail OAuth (which you already have):

```bash
# Google OAuth (already configured)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=your-oauth-callback-url

# App URL (for notification links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Twilio for SMS notifications
# TWILIO_ACCOUNT_SID=your-twilio-account-sid
# TWILIO_AUTH_TOKEN=your-twilio-auth-token
# TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

## Benefits of This Approach

✅ **No App Passwords needed** - uses OAuth tokens instead
✅ **More secure** - tokens can be revoked and have limited scope
✅ **Better user experience** - users authorize once during onboarding
✅ **Automatic token refresh** - handles expired tokens automatically
✅ **Uses user's own Gmail** - emails come from their actual Gmail address

## Troubleshooting

### "No Gmail OAuth tokens found"
- User needs to reconnect their Gmail account
- Go to Settings → Integrations → Reconnect Gmail

### "Failed to send email"
- Check that user has authorized Gmail access
- Verify the user has a valid email address in their profile
- Check server logs for specific error messages

### "Token expired"
- The app automatically refreshes tokens
- If refresh fails, user needs to reconnect Gmail

## Next Steps

1. **Test the notification system** with a connected Gmail account
2. **Set up Twilio** for SMS notifications (optional)
3. **Deploy to production** with proper environment variables

That's it! Your email notification system is now ready to use with Gmail OAuth. 🎉 