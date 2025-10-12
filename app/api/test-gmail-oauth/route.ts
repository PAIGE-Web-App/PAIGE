import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function GET(req: NextRequest) {
  try {
    console.log('TEST: Gmail OAuth test endpoint hit');
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing Google OAuth environment variables' 
      }, { status: 500 });
    }

    // Get the base URL from the request
    const { protocol, host } = new URL(req.url);
    const baseUrl = `${protocol}//${host}`;
    
    // Create OAuth2 client with local redirect URI
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/gmail/oauth-callback` // Use the current host for local testing
    );

    // Generate the authorization URL
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: 'test-user-id', // Test user ID
    });

    console.log('TEST: Generated OAuth URL:', authUrl);

    return NextResponse.json({
      success: true,
      message: 'Test OAuth URL generated',
      authUrl: authUrl,
      redirectUri: `${baseUrl}/api/gmail/oauth-callback`,
      clientId: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'missing',
      baseUrl: baseUrl
    });

  } catch (error: any) {
    console.error('TEST: Error generating OAuth URL:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 });
  }
}
