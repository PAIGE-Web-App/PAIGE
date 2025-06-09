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
    const { userId, contactEmail } = await req.json();
    console.log('[check-gmail-history] Payload:', { userId, contactEmail });
    if (!userId || !contactEmail) {
      console.log('[check-gmail-history] Missing userId or contactEmail');
      return NextResponse.json({ hasHistory: false, message: 'Missing userId or contactEmail.' }, { status: 400 });
    }
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    if (!userDocSnap.exists) {
      console.log('[check-gmail-history] User not found:', userId);
      return NextResponse.json({ hasHistory: false, message: 'User not found.' }, { status: 404 });
    }
    const userData = userDocSnap.data();
    const { accessToken, refreshToken } = userData?.googleTokens || {};
    if (!accessToken || !refreshToken) {
      console.log('[check-gmail-history] Missing Google tokens for user:', userId);
      return NextResponse.json({ hasHistory: false, message: 'Google authentication required.' }, { status: 401 });
    }
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error('[check-gmail-history] Missing Google OAuth environment variables.');
      return NextResponse.json({ hasHistory: false, message: 'Server misconfiguration: missing Google OAuth credentials.' }, { status: 500 });
    }
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    console.log('[check-gmail-history] Querying Gmail for:', contactEmail);
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `from:${contactEmail} OR to:${contactEmail}`,
      maxResults: 1,
    });
    const hasHistory = !!(res.data.messages && res.data.messages.length > 0);
    console.log('[check-gmail-history] Gmail API result:', { hasHistory, total: res.data.resultSizeEstimate });
    return NextResponse.json({ hasHistory });
  } catch (error) {
    console.error('[check-gmail-history] ERROR:', error);
    if (error instanceof Error) {
      console.error('[check-gmail-history] error.message:', error.message);
      // Log stack trace
      console.error(error.stack);
    }
    // Log error.config and error.response if present
    if (error && typeof error === 'object') {
      if ('config' in error) {
        console.error('[check-gmail-history] error.config:', error.config);
      }
      if ('response' in error) {
        console.error('[check-gmail-history] error.response:', error.response);
      }
    }
    return NextResponse.json({ hasHistory: false, message: 'Server error.' }, { status: 500 });
  }
} 