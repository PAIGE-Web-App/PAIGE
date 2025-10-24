import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGmailCalendarScopeString } from '@/lib/gmailScopes';

// Force this to be a dynamic route to access environment variables
export const dynamic = 'force-dynamic';

const getGoogleCredentials = () => {
  // Use server-side env vars (no NEXT_PUBLIC_ prefix needed for API routes)
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  console.log('🔍 Environment check:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    hasAppUrl: !!appUrl,
    clientIdLength: clientId?.length,
    clientSecretLength: clientSecret?.length
  });
  
  return {
    clientId,
    clientSecret,
    redirectUri: appUrl 
      ? `${appUrl}/api/auth/google-oauth-callback`
      : 'http://localhost:3000/api/auth/google-oauth-callback'
  };
};

export async function POST(req: NextRequest) {
  try {
    console.log('🔗 OAuth initiate endpoint called');
    
    const body = await req.json();
    const { userId, returnUrl = '/settings?oauth=success' } = body;

    console.log('📝 OAuth request:', { userId, returnUrl });

    if (!userId) {
      console.error('❌ No userId provided');
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get credentials dynamically
    const { clientId, clientSecret, redirectUri } = getGoogleCredentials();

    if (!clientId || !clientSecret) {
      console.error('❌ Missing Google OAuth credentials');
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Google credentials' 
      }, { status: 500 });
    }

    console.log('🔧 Creating OAuth2 client with redirect URI:', redirectUri);

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Encode state with userId and returnUrl
    const state = Buffer.from(JSON.stringify({ userId, returnUrl })).toString('base64');

    // Get all required scopes (Gmail + Calendar)
    const scopes = getGmailCalendarScopeString().split(' ');
    console.log('📋 Requesting scopes:', scopes);

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: scopes,
      state: state,
      prompt: 'consent', // Force consent screen to ensure refresh token is returned
      include_granted_scopes: true
    });

    console.log('✅ Generated OAuth URL for user:', userId);
    console.log('🔗 Auth URL:', authUrl);

    return NextResponse.json({ 
      success: true, 
      authUrl 
    });

  } catch (error: any) {
    console.error('❌ OAuth initiate error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to initiate OAuth flow' 
    }, { status: 500 });
  }
}

