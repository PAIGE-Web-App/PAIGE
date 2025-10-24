import type { NextApiRequest, NextApiResponse } from 'next';
import { getGmailCalendarScopeString } from '@/lib/gmailScopes';

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

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev 
      ? 'http://localhost:3000' 
      : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://weddingpaige.com');

    if (!clientId) {
      console.error('❌ Missing Google Client ID');
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error: Missing Google credentials' 
      });
    }

    const redirectUri = `${baseUrl}/api/oauth/google-callback`;
    const state = Buffer.from(JSON.stringify({ userId, returnUrl })).toString('base64');
    const scopes = getGmailCalendarScopeString();

    console.log('🔧 OAuth config:', { redirectUri, clientId: clientId.substring(0, 20) + '...' });

    // Build OAuth URL manually (no googleapis library needed!)
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: state,
      include_granted_scopes: 'true'
    })}`;

    console.log('✅ Generated OAuth URL for user:', userId);

    return res.status(200).json({ 
      success: true, 
      authUrl 
    });

  } catch (error: any) {
    console.error('❌ OAuth initiate error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to initiate OAuth flow' 
    });
  }
}
