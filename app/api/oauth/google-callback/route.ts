import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { google } from 'googleapis';

const getGoogleCredentials = () => {
  // Use server-side env vars (no NEXT_PUBLIC_ prefix needed for API routes)
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Determine base URL based on environment
  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl = isDev 
    ? 'http://localhost:3000' 
    : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://weddingpaige.com');
  
  return {
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/oauth/google-callback`
  };
};

export async function GET(req: NextRequest) {
  console.log('🎯 OAuth callback route called');
  console.log('🔗 Callback URL:', req.url);
  
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('📝 Callback params:', {
      hasCode: !!code,
      hasState: !!state,
      error: error
    });

    // Handle user cancellation
    if (error === 'access_denied') {
      console.log('❌ User cancelled OAuth flow');
      return NextResponse.redirect(new URL('/settings?oauth=cancelled', req.url));
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.redirect(new URL('/settings?oauth=error', req.url));
    }

    // Decode state to get userId and returnUrl
    let userId: string;
    let returnUrl = '/settings?oauth=success';
    
    try {
      const stateData = JSON.parse(Buffer.from(state || '', 'base64').toString());
      userId = stateData.userId;
      returnUrl = stateData.returnUrl || returnUrl;
    } catch (stateError) {
      console.error('Invalid state parameter:', stateError);
      return NextResponse.redirect(new URL('/settings?oauth=error', req.url));
    }

    // Verify user exists
    try {
      await adminAuth.getUser(userId);
    } catch (userError) {
      console.error('User not found:', userId);
      return NextResponse.redirect(new URL('/login?error=user_not_found', req.url));
    }

    // Get credentials dynamically
    const { clientId, clientSecret, redirectUri } = getGoogleCredentials();
    
    if (!clientId || !clientSecret) {
      console.error('❌ Missing Google OAuth credentials in callback');
      return NextResponse.redirect(new URL('/settings?oauth=error', req.url));
    }

    // Exchange authorization code for tokens
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    console.log('🔄 Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      console.error('No access token received from Google');
      return NextResponse.redirect(new URL('/settings?oauth=error', req.url));
    }

    console.log('✅ Received tokens from Google:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope
    });

    // Get user email from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Store tokens in Firestore with refresh token
    const googleTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null, // This should now exist!
      expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
      email: userInfo.email,
      scope: tokens.scope || '',
      tokenType: 'oauth', // Mark as OAuth flow (vs popup flow)
      updatedAt: new Date().toISOString()
    };

    await adminDb.collection('users').doc(userId).set({
      googleTokens,
      gmailConnected: true,
    }, { merge: true });

    console.log('✅ Tokens stored successfully for user:', userId);

    // Redirect back to the return URL with success
    return NextResponse.redirect(new URL(returnUrl, req.url));

  } catch (error: any) {
    console.error('❌ OAuth callback error:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error message:', error?.message);
    return NextResponse.redirect(new URL(`/settings?oauth=error&details=${encodeURIComponent(error?.message || 'Unknown error')}`, req.url));
  }
}

