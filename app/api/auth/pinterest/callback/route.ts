import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  
  // Check for OAuth errors
  if (error) {
    console.error('Pinterest OAuth error:', error);
    return NextResponse.redirect('/moodboards?error=pinterest_oauth_failed');
  }
  
  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect('/moodboards?error=no_auth_code');
  }
  
  // Verify state parameter for security
  if (state !== 'wedding_inspiration') {
    console.error('Invalid state parameter');
    return NextResponse.redirect('/moodboards?error=invalid_state');
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.PINTEREST_REDIRECT_URI || 'http://localhost:3000/api/auth/pinterest/callback'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Pinterest token exchange failed:', errorData);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    
    // Store the access token securely
    // In production, you'd store this in a database associated with the user
    console.log('Successfully obtained Pinterest access token');
    
    // For now, we'll redirect with success
    // In a real app, you'd store the token and redirect to the mood board
    return NextResponse.redirect('/moodboards?pinterest_connected=true&token=' + encodeURIComponent(tokenData.access_token));
    
  } catch (error) {
    console.error('Error exchanging Pinterest code for token:', error);
    return NextResponse.redirect('/moodboards?error=token_exchange_failed');
  }
}
