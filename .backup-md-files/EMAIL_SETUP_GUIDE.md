# Quick Email Setup Guide

Since you're having trouble with SendGrid domain setup, here's how to get email notifications working quickly with Gmail:

## 🚀 Quick Setup (5 minutes)

### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Find "2-Step Verification" and click "Get started"
4. Follow the setup process (usually involves your phone)

### Step 2: Generate App Password
1. Go back to Security settings
2. Find "App passwords" (appears after 2-Step Verification is enabled)
3. Click "App passwords"
4. Select "Mail" from the dropdown
5. Click "Generate"
6. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)

### Step 3: Add to Environment Variables
Add these to your `.env.local` file:

```bash
# Gmail Configuration
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password

# App URL (for links in emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Test It!
1. Restart your development server
2. Go to Settings → Notifications
3. Enable "Email Notifications"
4. Click "Test Notifications"
5. Check your email! 📧

## 🔧 Troubleshooting

**"Invalid credentials" error?**
- Make sure you're using the App Password, not your regular Gmail password
- The App Password is 16 characters with spaces

**"Less secure app" error?**
- You need to use App Passwords, not regular passwords
- Make sure 2-Step Verification is enabled

**No emails received?**
- Check your spam folder
- Verify the GMAIL_USER email is correct
- Make sure the App Password is copied correctly

## 🎯 Why This Works

- **No domain setup required** - Gmail handles everything
- **Free** - No monthly costs like SendGrid
- **Reliable** - Gmail's infrastructure is rock solid
- **Perfect for development** - Works with localhost

## 📈 For Production

When you're ready to deploy, you can:
1. Keep using Gmail (works fine for small to medium apps)
2. Switch to SendGrid with a real domain
3. Use other services like Mailgun, Amazon SES, etc.

The notification system will automatically use whichever email service you configure! 