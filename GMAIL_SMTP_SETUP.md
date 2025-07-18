# Gmail SMTP Setup Guide

## Step 1: Generate App Password ✅
You've already completed this step! You should have a 16-character App Password from Google.

## Step 2: Create Environment File
Create a `.env.local` file in your project root with the following content:

```bash
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password

# App URL (for notification links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Twilio SMS Configuration (if you want SMS notifications)
# TWILIO_ACCOUNT_SID=your-twilio-account-sid
# TWILIO_AUTH_TOKEN=your-twilio-auth-token
# TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

## Step 3: Replace Placeholder Values
1. **Replace `your-email@gmail.com`** with your actual Gmail address
2. **Replace `your-16-character-app-password`** with the App Password you just generated
3. **Update `NEXT_PUBLIC_APP_URL`** to your production URL when deploying

## Step 4: Test the Setup
Once you've created the `.env.local` file, restart your development server:

```bash
npm run dev
```

## Step 5: Test Email Notifications
You can test the email functionality by:
1. Going to your app
2. Adding a contact with an email address
3. Sending them an in-app message
4. The system should now send them an email notification

## Troubleshooting

### Common Issues:
1. **"Invalid login" error**: Make sure you're using the App Password, not your regular Gmail password
2. **"Less secure app access" error**: This is normal - App Passwords are designed for this use case
3. **"Authentication failed"**: Double-check that your Gmail address and App Password are correct

### Security Notes:
- The `.env.local` file is automatically ignored by Git
- Never commit your App Password to version control
- App Passwords are more secure than regular passwords for this use case

## Next Steps
After setting up Gmail SMTP, you can:
1. Test the notification system
2. Set up Twilio for SMS notifications (optional)
3. Deploy to production with proper environment variables 