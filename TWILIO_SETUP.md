# Twilio SMS Setup Guide

## Step 1: Create Twilio Account
1. Go to [twilio.com](https://www.twilio.com) and sign up
2. Verify your email and phone number
3. Complete account verification (may require credit card for trial)

## Step 2: Get Your Credentials
1. In Twilio Console, go to **Account Info** → **API Keys & Tokens**
2. Note down:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (or create an API Key)
   - **API Key SID** and **Secret** (if using API Key)

## Step 3: Purchase a Phone Number
1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a number that supports SMS
3. Note down the **phone number** you purchase

## Step 4: Set Up Webhook URL
1. Go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click on your number
3. In **Messaging Configuration**:
   - Set **Webhook URL** to: `https://yourdomain.com/api/sms/webhook`
   - Set **HTTP Method** to: `POST`

## Step 5: Add Environment Variables
Add these to your `.env.local` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

## Step 6: Deploy Your App
Make sure your app is deployed and accessible at the webhook URL you configured.

## Testing
1. Send an SMS from your app to a test phone number
2. Reply to the SMS from the test phone
3. Check that the reply appears in your app's message pane

## Cost Considerations
- **SMS Sending**: ~$0.0079 per message (US numbers)
- **SMS Receiving**: ~$0.0079 per message
- **Phone Number**: ~$1/month per number

## Troubleshooting
- Ensure your webhook URL is publicly accessible
- Check that environment variables are set correctly
- Verify your Twilio account has sufficient credits
- Monitor Twilio logs for any webhook delivery issues 