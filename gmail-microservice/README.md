# Gmail Microservice for Wedding Paige

This is a dedicated microservice that handles Gmail API calls for the Wedding Paige app, deployed on Render.

## Why This Exists

Vercel serverless functions block outbound calls to Gmail APIs, so we use this external service to handle all Gmail functionality.

## Endpoints

- `GET /health` - Health check
- `POST /gmail-reply` - Send Gmail reply
- `POST /gmail-send` - Send new Gmail message

## Environment Variables

Copy `env.example` to `.env` and fill in your values:

- `FIREBASE_SERVICE_ACCOUNT_KEY` - Base64 encoded Firebase service account key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - Google OAuth redirect URI
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID

## Local Development

```bash
npm install
npm run dev
```

## Deployment

This service is deployed on Render and automatically pulls from the main repository.

## Usage from Vercel App

Instead of calling Gmail APIs directly, your Vercel app calls this service:

```javascript
// Instead of calling /api/gmail-reply on Vercel
const response = await fetch('https://your-render-app.onrender.com/gmail-reply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, to, subject, body, ... })
});
```
