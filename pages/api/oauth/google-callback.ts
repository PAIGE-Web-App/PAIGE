import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🎯 OAuth callback route called');
  
  try {
    const { code, state, error } = req.query;

    console.log('📝 Callback params:', {
      hasCode: !!code,
      hasState: !!state,
      error: error
    });

    if (error === 'access_denied') {
      console.log('❌ User cancelled OAuth flow');
      return res.redirect('/settings?oauth=cancelled');
    }

    if (!code || typeof code !== 'string') {
      console.error('❌ No authorization code received');
      return res.redirect('/settings?oauth=error');
    }

    // Decode state
    let userId: string;
    let returnUrl = '/settings?oauth=success';
    
    try {
      const stateData = JSON.parse(Buffer.from(state as string || '', 'base64').toString());
      userId = stateData.userId;
      returnUrl = stateData.returnUrl || returnUrl;
    } catch (stateError) {
      console.error('Invalid state parameter:', stateError);
      return res.redirect('/settings?oauth=error');
    }

    // Verify user exists
    try {
      await adminAuth.getUser(userId);
    } catch (userError) {
      console.error('User not found:', userId);
      return res.redirect('/login?error=user_not_found');
    }

    console.log('🔄 Exchanging authorization code for tokens...');

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev 
      ? 'http://localhost:3000' 
      : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://weddingpaige.com');
    const redirectUri = `${baseUrl}/api/oauth/google-callback`;

    // Exchange code for tokens using direct HTTP request (no googleapis library!)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Token exchange failed:', errorData);
      return res.redirect('/settings?oauth=error');
    }

    const tokens = await tokenResponse.json();
    
    console.log('✅ Received tokens from Google:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    });

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const userInfo = await userInfoResponse.json();

    // Store tokens in Firestore
    const googleTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiryDate: Date.now() + (tokens.expires_in * 1000),
      email: userInfo.email,
      scope: tokens.scope || '',
      tokenType: 'oauth',
      updatedAt: new Date().toISOString()
    };

    await adminDb.collection('users').doc(userId).set({
      googleTokens,
      gmailConnected: true,
    }, { merge: true });

    console.log('✅ Tokens stored successfully for user:', userId);

    return res.redirect(returnUrl);

  } catch (error: any) {
    console.error('❌ OAuth callback error:', error);
    console.error('❌ Error stack:', error?.stack);
    return res.redirect(`/settings?oauth=error&details=${encodeURIComponent(error?.message || 'Unknown error')}`);
  }
}
