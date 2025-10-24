import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { getGmailCalendarScopeString } from '@/lib/gmailScopes';

const getGoogleCredentials = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl = isDev 
    ? 'http://localhost:3000' 
    : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://weddingpaige.com');
  
  console.log('🔍 Environment check:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    nodeEnv: process.env.NODE_ENV,
    isDev,
    baseUrl,
    clientIdLength: clientId?.length,
    clientSecretLength: clientSecret?.length
  });
  
  return {
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/oauth/google-callback`
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(405).json({ 
      error: 'This endpoint only accepts POST requests',
      usage: 'Send a POST request with { userId, returnUrl } in the body'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔗 OAuth initiate endpoint called');
    
    const { userId, returnUrl = '/settings?oauth=success' } = req.body;

    console.log('📝 OAuth request:', { userId, returnUrl });

    if (!userId) {
      console.error('❌ No userId provided');
      return res.status(400).json({ error: 'User ID required' });
    }

    const { clientId, clientSecret, redirectUri } = getGoogleCredentials();

    if (!clientId || !clientSecret) {
      console.error('❌ Missing Google OAuth credentials');
      console.error('❌ Available env vars:', {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasNextPublicGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        nodeEnv: process.env.NODE_ENV
      });
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error: Missing Google credentials' 
      });
    }

    console.log('🔧 Creating OAuth2 client with redirect URI:', redirectUri);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const state = Buffer.from(JSON.stringify({ userId, returnUrl })).toString('base64');

    const scopes = getGmailCalendarScopeString().split(' ');
    console.log('📋 Requesting scopes:', scopes);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent',
      include_granted_scopes: true
    });

    console.log('✅ Generated OAuth URL for user:', userId);
    console.log('🔗 Auth URL:', authUrl);

    return res.status(200).json({ 
      success: true, 
      authUrl 
    });

  } catch (error: any) {
    console.error('❌ OAuth initiate error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to initiate OAuth flow' 
    });
  }
}
