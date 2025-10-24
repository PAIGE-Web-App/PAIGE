import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGmailCalendarScopeString } from '@/lib/gmailScopes';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-oauth-callback`
  : 'http://localhost:3000/api/auth/google-oauth-callback';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, returnUrl = '/settings?oauth=success' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    // Encode state with userId and returnUrl
    const state = Buffer.from(JSON.stringify({ userId, returnUrl })).toString('base64');

    // Get all required scopes (Gmail + Calendar)
    const scopes = getGmailCalendarScopeString().split(' ');

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: scopes,
      state: state,
      prompt: 'consent', // Force consent screen to ensure refresh token is returned
      include_granted_scopes: true
    });

    console.log('🔗 Generated OAuth URL for user:', userId);

    return NextResponse.json({ 
      success: true, 
      authUrl 
    });

  } catch (error) {
    console.error('❌ OAuth initiate error:', error);
    return NextResponse.json({ 
      error: 'Failed to initiate OAuth flow' 
    }, { status: 500 });
  }
}

