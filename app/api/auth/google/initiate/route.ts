// app/api/auth/google/initiate/route.ts
// This file will handle the initiation of the Google OAuth 2.0 flow.

import { NextResponse } from 'next/server';

// IMPORTANT: Replace these with your actual Google Cloud Project credentials.
// You should store these securely, e.g., in environment variables (process.env.GOOGLE_CLIENT_ID).
// These should now be loaded from process.env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // Changed to use process.env
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; // Changed to use process.env

// The URL where Google will redirect after the user grants/denies permission.
// This should match an Authorized Redirect URI in your Google Cloud Project.
// For local development, this might be http://localhost:3000/api/auth/google/callback
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // Changed to use process.env

// Debug: Log the environment variables
console.log('🔍 [Google OAuth Initiate] Environment variables:', {
  hasClientId: !!GOOGLE_CLIENT_ID,
  hasClientSecret: !!GOOGLE_CLIENT_SECRET,
  redirectUri: GOOGLE_REDIRECT_URI // Log the actual redirect URI
});

// Scopes define the permissions your application is requesting.
// For reading Gmail messages, you'll need at least 'https://www.googleapis.com/auth/gmail.readonly'
// You might also need 'profile' and 'email' to get user info.
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly', // To read Gmail messages
  'https://www.googleapis.com/auth/gmail.send', // To send email
  'https://www.googleapis.com/auth/calendar', // To manage Google Calendar
  'https://www.googleapis.com/auth/calendar.events', // To manage calendar events
  // Add more scopes as needed, e.g., 'https://www.googleapis.com/auth/gmail.modify' for sending
].join(' ');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const frontendRedirectUri = searchParams.get('redirectUri'); // The URL to redirect back to on the frontend

  console.log('🔍 [Google OAuth Initiate] Request received:', {
    userId,
    frontendRedirectUri,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    currentRedirectUri: GOOGLE_REDIRECT_URI // Log it here too
  });

  if (!userId || !frontendRedirectUri) {
    console.error('❌ [Google OAuth Initiate] Missing required parameters:', { userId, frontendRedirectUri });
    return NextResponse.json({ error: 'Missing userId or redirectUri' }, { status: 400 });
  }

  // --- Validate Environment Variables ---
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    console.error("❌ [Google OAuth Initiate] Missing Google API environment variables:", {
      hasClientId: !!GOOGLE_CLIENT_ID,
      redirectUri: GOOGLE_REDIRECT_URI
    });
    return NextResponse.json({ success: false, message: 'Server configuration error: Google API credentials missing.' }, { status: 500 });
  }
  // --- END Validation ---

  // Construct the Google OAuth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('access_type', 'offline'); // To get a refresh token
  authUrl.searchParams.append('prompt', 'consent'); // To ensure consent screen is shown
  authUrl.searchParams.append('state', JSON.stringify({ userId, frontendRedirectUri })); // Pass state to callback

  console.log('✅ [Google OAuth Initiate] Final auth URL:', authUrl.toString());
  console.log('📋 [Google OAuth Initiate] Scopes being requested:', SCOPES);

  // Redirect the user to Google's consent screen
  return NextResponse.redirect(authUrl.toString());
}