/**
 * Google Token Refresh Utility
 * 
 * This utility handles automatic refresh of Google OAuth access tokens
 * using refresh tokens. This allows Gmail/Calendar integration to work
 * indefinitely without requiring user re-authentication.
 */

import { google } from 'googleapis';
import { adminDb } from './firebaseAdmin';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-oauth-callback`
  : 'http://localhost:3000/api/auth/google-oauth-callback';

interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiryDate: number;
  email?: string;
  scope?: string;
  tokenType?: 'oauth' | 'popup';
}

/**
 * Refresh access token using refresh token
 * Returns updated tokens or null if refresh fails
 */
export async function refreshGoogleAccessToken(
  userId: string,
  currentTokens: GoogleTokens
): Promise<GoogleTokens | null> {
  try {
    const { refreshToken } = currentTokens;

    if (!refreshToken) {
      console.log('⚠️ No refresh token available for user:', userId);
      return null;
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    // Set current credentials
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    console.log('🔄 Refreshing access token for user:', userId);

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      console.error('❌ No access token received after refresh');
      return null;
    }

    // Update tokens
    const updatedTokens: GoogleTokens = {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken, // Keep existing if new one not provided
      expiryDate: credentials.expiry_date || Date.now() + 3600 * 1000,
      email: currentTokens.email,
      scope: credentials.scope || currentTokens.scope,
      tokenType: 'oauth'
    };

    // Save updated tokens to Firestore
    await adminDb.collection('users').doc(userId).set({
      googleTokens: updatedTokens
    }, { merge: true });

    console.log('✅ Access token refreshed successfully for user:', userId);

    return updatedTokens;

  } catch (error: any) {
    console.error('❌ Token refresh failed:', error.message);
    
    // If refresh token is invalid/revoked, return null so app can show reauth banner
    if (error.message?.includes('invalid_grant') || error.message?.includes('Token has been expired or revoked')) {
      console.log('⚠️ Refresh token invalid or revoked, user needs to re-authenticate');
      return null;
    }
    
    return null;
  }
}

/**
 * Get valid access token, refreshing if necessary
 * This is the main function to use before making Google API calls
 */
export async function getValidAccessToken(
  userId: string,
  currentTokens: GoogleTokens
): Promise<string | null> {
  try {
    const { accessToken, expiryDate, refreshToken } = currentTokens;

    // Check if token is still valid (with 5 minute buffer)
    const isExpired = expiryDate < Date.now() + (5 * 60 * 1000);

    if (!isExpired) {
      console.log('✅ Access token still valid for user:', userId);
      return accessToken;
    }

    console.log('⏰ Access token expired or expiring soon, attempting refresh...');

    // Try to refresh if we have a refresh token
    if (refreshToken) {
      const newTokens = await refreshGoogleAccessToken(userId, currentTokens);
      
      if (newTokens) {
        return newTokens.accessToken;
      }
    }

    // No refresh token or refresh failed
    console.log('❌ Cannot refresh token, user needs to re-authenticate');
    return null;

  } catch (error) {
    console.error('❌ Error getting valid access token:', error);
    return null;
  }
}

/**
 * Check if user has OAuth tokens (with refresh token) vs popup tokens
 */
export function hasRefreshToken(tokens: GoogleTokens | null): boolean {
  return !!(tokens?.refreshToken && tokens?.tokenType === 'oauth');
}

