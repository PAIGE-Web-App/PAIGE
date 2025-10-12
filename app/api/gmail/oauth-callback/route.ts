import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export async function GET(req: NextRequest) {
  try {
    console.log('START: /api/gmail/oauth-callback route hit');
    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error('CRITICAL ERROR: adminDb is undefined in gmail/oauth-callback/route.ts');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should be the userId
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.json({ success: false, message: `OAuth error: ${error}` }, { status: 400 });
    }

    if (!code || !state) {
      return NextResponse.json({ success: false, message: 'Missing authorization code or state' }, { status: 400 });
    }

    const userId = state;
    console.log('DEBUG: Processing OAuth callback for user:', userId);

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error('Missing Google OAuth environment variables in gmail/oauth-callback/route.ts');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('Gmail OAuth Callback: Received tokens for user:', userId, 'Has refresh token:', !!tokens.refresh_token);

    // Store tokens in Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.set({
      googleTokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token, // This is the crucial refresh token!
        expiryDate: tokens.expiry_date,
        scope: tokens.scope,
        email: null, // Email will be fetched from Gmail profile
      },
      gmailConnected: true,
      gmailImportCompleted: true,
    }, { merge: true });

    // Now set up Gmail Watch with the new tokens
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Use a shared Pub/Sub topic for all users
      const topicName = `projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/topics/gmail-notifications`;
      
      console.log('Gmail Watch setup: Setting up watch for user:', userId, 'with topic:', topicName);

      // Set up Gmail Watch
      const watchResponse = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: topicName,
          labelIds: ['INBOX'], // Only watch for new messages in INBOX
        },
      });

      // Store watch information in Firestore
      await userDocRef.set({
        gmailWatch: {
          isActive: true,
          historyId: watchResponse.data.historyId,
          expiration: watchResponse.data.expiration,
          lastSetupAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      }, { merge: true });

      console.log('Gmail Watch setup successful for user:', userId, 'Response:', watchResponse.data);

      // Redirect back to the app with success
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/settings?gmail_oauth=success`;
      return NextResponse.redirect(redirectUrl);

    } catch (watchError: any) {
      console.error('Error setting up Gmail Watch for user:', userId, watchError);
      // Still redirect but with error
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/settings?gmail_oauth=error&message=${encodeURIComponent(watchError.message)}`;
      return NextResponse.redirect(redirectUrl);
    }

  } catch (error: any) {
    console.error('Error in /api/gmail/oauth-callback:', error);
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://weddingpaige.com'}/settings?gmail_oauth=error&message=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(redirectUrl);
  }
}
