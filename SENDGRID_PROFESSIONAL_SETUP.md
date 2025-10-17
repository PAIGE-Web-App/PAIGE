# 🚀 Professional SendGrid Setup Guide

## Step 1: Create SendGrid Account

1. **Go to [SendGrid.com](https://sendgrid.com)** and sign up
2. **Choose "Free" plan** (100 emails/day, perfect for development)
3. **Verify your email** and complete account setup
4. **Complete Sender Authentication** (required for production)

## Step 2: Get API Key

1. **Go to Settings → API Keys**
2. **Click "Create API Key"**
3. **Choose "Full Access"** (or "Restricted Access" with Mail Send permissions)
4. **Copy the API key** (starts with `SG.`)
5. **Save it securely** - you can't see it again!

## Step 3: Set Up Sender Authentication

### Option A: Single Sender Verification (Quick)
1. **Go to Settings → Sender Authentication**
2. **Click "Verify a Single Sender"**
3. **Add your email** (e.g., `noreply@paige.app`)
4. **Check your email** and click the verification link

### Option B: Domain Authentication (Professional)
1. **Go to Settings → Sender Authentication**
2. **Click "Authenticate Your Domain"**
3. **Add your domain** (e.g., `paige.app`)
4. **Add DNS records** to your domain provider
5. **Verify domain** (takes 24-48 hours)

## Step 4: Add Environment Variables

Add these to your `.env.local` file:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@paige.app

# App URL (for links in emails)
NEXT_PUBLIC_APP_URL=https://paige.app
```

## Step 5: Test Your Setup

1. **Restart your development server**
2. **Go to Settings → Notifications**
3. **Click "Test Notifications"**
4. **Check your email!** 📧

## 🎯 Benefits of SendGrid

- **Professional delivery** - Better inbox placement
- **Analytics** - Track opens, clicks, bounces
- **Scalability** - Handle millions of emails
- **Reliability** - 99.9% uptime SLA
- **Compliance** - GDPR, CAN-SPAM compliant

## 💰 Cost Breakdown

- **Free Tier**: 100 emails/day
- **Essentials**: $19.95/month for 50,000 emails
- **Pro**: $89.95/month for 100,000 emails
- **Per email cost**: ~$0.0004 per email

## 🔧 Troubleshooting

**"Invalid API key" error?**
- Check the API key is correct (starts with `SG.`)
- Ensure you have "Mail Send" permissions

**"Sender not verified" error?**
- Complete sender authentication
- Use a verified email address

**Emails going to spam?**
- Set up domain authentication
- Use a professional from address
- Avoid spam trigger words

## 🚀 Next Steps

Once SendGrid is working:

1. **Test password reset emails**
2. **Set up 2FA with SMS (Twilio) + Email (SendGrid)**
3. **Add email verification for new signups**
4. **Monitor email analytics**

## 📊 Monitoring

Check your SendGrid dashboard for:
- **Delivery rates**
- **Open rates**
- **Click rates**
- **Bounce rates**
- **Spam reports**

Your email system is now professional-grade! 🎉
