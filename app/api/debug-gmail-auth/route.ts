/**
 * Debug Gmail Authentication Status
 * Temporary endpoint to diagnose Gmail OAuth issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get user's Gmail tokens
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const tokens = userData?.googleTokens;
    
    if (!tokens) {
      return NextResponse.json({ 
        error: 'No Gmail tokens found',
        status: 'not_connected'
      });
    }

    const { accessToken, refreshToken, expiryDate } = tokens;
    
    // Check token expiry
    const now = Date.now();
    const isExpired = expiryDate && expiryDate < now;
    const expiresIn = expiryDate ? Math.round((expiryDate - now) / 1000 / 60) : null; // minutes

    // Test the token
    let tokenValid = false;
    let tokenError = null;
    
    if (accessToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        
        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        await gmail.users.getProfile({ userId: 'me' });
        tokenValid = true;
      } catch (error: any) {
        tokenError = error.message;
        console.error('Token validation failed:', error);
      }
    }

    // Try to refresh if expired and refresh token exists
    let refreshAttempted = false;
    let refreshSuccess = false;
    let refreshError = null;
    
    if (isExpired && refreshToken) {
      refreshAttempted = true;
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        
        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        const { credentials } = await oauth2Client.refreshAccessToken();
        refreshSuccess = true;
        
        // Update tokens in database
        await userDocRef.set({
          googleTokens: {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || refreshToken,
            expiryDate: credentials.expiry_date,
          },
        }, { merge: true });
        
      } catch (error: any) {
        refreshError = error.message;
        console.error('Token refresh failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      tokens: {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        expiryDate: expiryDate,
        isExpired,
        expiresInMinutes: expiresIn,
      },
      validation: {
        tokenValid,
        tokenError,
        refreshAttempted,
        refreshSuccess,
        refreshError,
      },
      recommendation: tokenValid ? 
        'Gmail authentication is working correctly' :
        isExpired && !refreshToken ?
        'Token expired and no refresh token. User needs to re-authorize Gmail.' :
        isExpired && refreshToken && !refreshSuccess ?
        'Token expired and refresh failed. User may need to re-authorize Gmail.' :
        'Gmail authentication needs attention'
    });

  } catch (error: any) {
    console.error('Debug Gmail auth error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      message: error.message 
    }, { status: 500 });
  }
}