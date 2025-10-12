import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export async function POST(req: Request) {
  try {
    console.log('[check-gmail-history] Route hit');
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[check-gmail-history] adminDb is undefined');
      return NextResponse.json({ hasHistory: false, message: 'Server configuration error' }, { status: 500 });
    }

    const { userId, contactEmail } = await req.json();
    console.log('[check-gmail-history] Payload:', { userId, contactEmail });
    
    if (!userId || !contactEmail) {
      console.log('[check-gmail-history] Missing userId or contactEmail');
      return NextResponse.json({ hasHistory: false, message: 'Missing userId or contactEmail.' }, { status: 400 });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error('[check-gmail-history] Missing Google OAuth environment variables');
      return NextResponse.json({ hasHistory: false, message: 'Server configuration error: missing Google OAuth credentials.' }, { status: 500 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      console.log('[check-gmail-history] User not found:', userId);
      return NextResponse.json({ hasHistory: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};

    if (!accessToken) {
      console.log('[check-gmail-history] Missing access token for user:', userId);
      return NextResponse.json({ hasHistory: false, message: 'Google authentication required.' }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({ 
      access_token: accessToken, 
      refresh_token: refreshToken || undefined 
    });

    // Check if token needs refresh (only if we have a refresh token)
    const tokenExpiry = oauth2Client.credentials.expiry_date;
    if (tokenExpiry && tokenExpiry < Date.now()) {
      if (refreshToken) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(credentials);
          await userDocRef.set({
            googleTokens: {
              accessToken: credentials.access_token,
              refreshToken: credentials.refresh_token || refreshToken,
              expiryDate: credentials.expiry_date,
            },
          }, { merge: true });
          console.log('[check-gmail-history] Access token refreshed successfully');
        } catch (refreshError) {
          console.error('[check-gmail-history] Error refreshing token:', refreshError);
          return NextResponse.json({ hasHistory: false, message: 'Failed to refresh Google authentication.' }, { status: 401 });
        }
      } else {
        // No refresh token available (Firebase popup flow), token has expired
        console.log('[check-gmail-history] Access token expired and no refresh token available');
        return NextResponse.json({ hasHistory: false, message: 'Google authentication expired. Please re-authenticate.' }, { status: 401 });
      }
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    console.log('[check-gmail-history] Querying Gmail for:', contactEmail);
    
    // Import rate limit handler
    const { GmailRateLimitHandler } = await import('@/utils/gmailRateLimitHandler');
    
    const res = await GmailRateLimitHandler.executeWithRetry(async () => {
      return await gmail.users.messages.list({
        userId: 'me',
        q: `from:${contactEmail} OR to:${contactEmail}`,
        maxResults: 1,
      });
    });

    const hasHistory = !!(res.data.messages && res.data.messages.length > 0);
    console.log('[check-gmail-history] Gmail API result:', { hasHistory, total: res.data.resultSizeEstimate });
    
    return NextResponse.json({ hasHistory });
  } catch (error) {
    console.error('[check-gmail-history] ERROR:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        return NextResponse.json({ hasHistory: false, message: 'Google authentication expired. Please re-authenticate.' }, { status: 401 });
      }
      if (error.message.includes('quota')) {
        return NextResponse.json({ hasHistory: false, message: 'Google API quota exceeded.' }, { status: 429 });
      }
    }

    // Log additional error details if available
    if (error && typeof error === 'object') {
      if ('config' in error) {
        console.error('[check-gmail-history] error.config:', error.config);
      }
      if ('response' in error) {
        console.error('[check-gmail-history] error.response:', error.response);
      }
    }

    return NextResponse.json({ hasHistory: false, message: 'An error occurred while checking Gmail history.' }, { status: 500 });
  }
} 