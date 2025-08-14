import { NextResponse } from 'next/server';

export async function GET() {
  const PINTEREST_APP_ID = process.env.PINTEREST_APP_ID;
  const PINTEREST_REDIRECT_URI = process.env.PINTEREST_REDIRECT_URI || 'http://localhost:3000/api/auth/pinterest/callback';
  
  if (!PINTEREST_APP_ID) {
    console.error('Pinterest App ID not configured');
    return NextResponse.redirect('/inspiration?error=pinterest_not_configured');
  }

  // Build Pinterest OAuth URL
  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.set('client_id', PINTEREST_APP_ID);
  authUrl.searchParams.set('redirect_uri', PINTEREST_REDIRECT_URI);
  authUrl.searchParams.set('scope', 'boards:read,pins:read');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', 'wedding_inspiration'); // Optional: for security

  console.log('Redirecting to Pinterest OAuth:', authUrl.toString());
  
  return NextResponse.redirect(authUrl.toString());
}
