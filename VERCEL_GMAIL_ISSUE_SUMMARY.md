# Vercel Gmail API Issue Summary

## Issue Description
All API routes making `fetch()` calls to Gmail API domains return **405 Method Not Allowed** in production, but work perfectly in local development.

## Test Results

### ✅ Working Routes (200 OK)
- Simple test routes without external API calls
- Routes with Firebase Admin SDK
- Routes with `googleapis` library imported but not used
- Routes with complex business logic
- Routes calling other external APIs (non-Gmail)

### ❌ Failing Routes (405 Error)
- ANY route making `fetch()` calls to `gmail.googleapis.com`
- Routes using `googleapis` npm library to call Gmail API
- Routes using native `fetch()` to call Gmail API
- Minimal test routes with only Gmail API calls

## Evidence

### Test Route 1: Minimal Gmail API Call
```typescript
export async function POST(req: NextRequest) {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer fake-token' }
  });
  return NextResponse.json({ status: response.status });
}
```
**Result:** 405 in production, works locally

### Test Route 2: Without googleapis Library
```typescript
// Uses native fetch() instead of googleapis npm library
const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ raw: encodedEmail })
});
```
**Result:** 405 in production, works locally

## What We've Tried
1. ✅ Removed `googleapis` npm library dependency
2. ✅ Used native `fetch()` instead of library
3. ✅ Verified all environment variables are correct
4. ✅ Tested different route names (gmail-reply, send-email, etc.)
5. ✅ Simplified to bare minimum code
6. ✅ Checked OAuth credentials and scopes

## Environment Variables (All Verified)
- GOOGLE_CLIENT_ID: Set ✅
- GOOGLE_CLIENT_SECRET: Set ✅
- GOOGLE_REDIRECT_URI: Set ✅
- FIREBASE_SERVICE_ACCOUNT_KEY: Set ✅
- All NEXT_PUBLIC_FIREBASE_* variables: Set ✅

## Conclusion
The ONLY common factor in all failing routes is outbound `fetch()` calls to `gmail.googleapis.com` domains.

## Request to Vercel Support
Is there a network-level policy, firewall rule, or security restriction blocking outbound connections to Gmail API domains from Vercel serverless functions?

If so, what's the recommended approach for Gmail integration on Vercel?

---
Date: October 22, 2025
Project: Wedding Paige (weddingpaige.com)

