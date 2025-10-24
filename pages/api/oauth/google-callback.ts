import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { google } from 'googleapis';

const getGoogleCredentials = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🎯 OAuth callback route called');
  console.log('🔗 Callback URL:', req.url);
  
  try {
    const { code, state, error } = req.query;

    console.log('📝 Callback params:', {
      hasCode: !!code,
      hasState: !!state,
      error: error
    });

    // Handle user cancellation
    if (error === 'access_denied') {
      console.log('❌ User cancelled OAuth flow');
      return res.redirect('/settings?oauth=cancelled');
    }

    if (!code || typeof code !== 'string') {
      console.error('❌ No authorization code received');
      return res.redirect('/settings?oauth=error');
    }

    // Decode state to get userId and returnUrl
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

    // Get credentials
    const { clientId, clientSecret, redirectUri } = getGoogleCredentials();

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('✅ Received tokens from Google:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope
    });

    // Get user info
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Store tokens in Firestore
    const googleTokens = {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || null,
      expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
      email: userInfo.data.email!,
      scope: tokens.scope || '',
      tokenType: 'oauth',
      updatedAt: new Date().toISOString()
    };

    await adminDb.collection('users').doc(userId).set({
      googleTokens,
      gmailConnected: true,
    }, { merge: true });

    console.log('✅ Tokens stored successfully for user:', userId);

    // Redirect back to the return URL with success
    return res.redirect(returnUrl);

  } catch (error: any) {
    console.error('❌ OAuth callback error:', error);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error message:', error?.message);
    return res.redirect(`/settings?oauth=error&details=${encodeURIComponent(error?.message || 'Unknown error')}`);
  }
}
