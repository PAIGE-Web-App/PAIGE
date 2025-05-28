import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
// MODIFIED: Removed doc and setDoc imports from 'firebase/firestore'
// import { doc, setDoc } from 'firebase/firestore'; 

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // Your OAuth callback URL

export async function GET(request: Request) {
  const adminDb = getAdminDb();

  if (!adminDb) {
    console.error('CRITICAL ERROR: adminDb is undefined after getAdminDb() call in auth/google/callback/route.ts');
    return NextResponse.json({ success: false, message: 'Server configuration error: Firestore Admin DB not initialized correctly.' }, { status: 500 });
  }
  console.log('DEBUG: adminDb is successfully obtained in auth/google/callback/route.ts:', !!adminDb);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');

  if (!code) {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    console.error('Google OAuth error:', error, errorDescription);

    let frontendRedirectUrl = '/';
    if (stateParam) {
      try {
        const state = JSON.parse(stateParam);
        frontendRedirectUrl = `${state.frontendRedirectUri}?gmailAuth=error`;
      } catch (e) {
        console.error('Error parsing state during OAuth error:', e);
      }
    }
    return NextResponse.redirect(frontendRedirectUrl);
  }

  let userId: string | null = null;
  let frontendRedirectUri: string = '/';

  if (stateParam) {
    try {
      const state = JSON.parse(stateParam);
      userId = state.userId;
      frontendRedirectUri = state.frontendRedirectUri;
    } catch (e) {
      console.error('Error parsing state:', e);
    }
  }

  if (!userId) {
    console.error('User ID not found in OAuth state.');
    return NextResponse.redirect(`${frontendRedirectUri}?gmailAuth=error`);
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Error exchanging code for tokens:', tokenData.error, tokenData.error_description);
      return NextResponse.redirect(`${frontendRedirectUri}?gmailAuth=error`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // MODIFIED: Use adminDb.collection().doc().set() for Admin SDK Firestore operations
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.set({
      googleTokens: { // Ensure this matches the structure expected by start-gmail-import
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + (expires_in * 1000),
      },
    }, { merge: true });

    console.log('Google tokens stored successfully for user:', userId);

    return NextResponse.redirect(`${frontendRedirectUri}?gmailAuth=success`);

  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    return NextResponse.redirect(`${frontendRedirectUri}?gmailAuth=error`);
  }
}
