import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export async function POST(req: NextRequest) {
  try {
    console.log('START: /api/gmail/setup-watch-oauth route hit');
    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error('CRITICAL ERROR: adminDb is undefined after getAdminDb() call in gmail/setup-watch-oauth/route.ts');
      return NextResponse.json({ success: false, message: 'Server configuration error: Firestore Admin DB not initialized correctly.' }, { status: 500 });
    }

    const { userId } = await req.json();
    console.log('DEBUG: Received userId for Gmail Watch OAuth setup:', userId);

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId.' }, { status: 400 });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error('Missing Google OAuth environment variables in gmail/setup-watch-oauth/route.ts');
      return NextResponse.json({ success: false, message: 'Server configuration error: missing Google OAuth credentials.' }, { status: 500 });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    // Generate the authorization URL
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify', // Required for Watch API
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    // Use the correct redirect URI that matches our callback endpoint
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/api/gmail/oauth-callback`;
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // This is crucial for getting refresh tokens
      scope: scopes,
      prompt: 'consent', // Force consent screen to ensure refresh token
      state: userId, // Pass userId in state for callback
      redirect_uri: redirectUri, // Use the correct redirect URI
    });

    console.log('Gmail Watch OAuth: Generated auth URL for user:', userId);

    return NextResponse.json({ 
      success: true, 
      message: 'OAuth authorization URL generated.',
      authUrl: authUrl,
      userId: userId
    });

  } catch (error: any) {
    console.error('Error in /api/gmail/setup-watch-oauth:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
