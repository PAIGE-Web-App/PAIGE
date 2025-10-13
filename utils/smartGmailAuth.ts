/**
 * Smart Gmail Authentication Utility
 * 
 * This utility provides intelligent Gmail authentication handling that:
 * 1. Detects when tokens are invalid before making API calls
 * 2. Attempts token refresh when possible
 * 3. Provides clear error messages for different failure scenarios
 * 4. Minimizes API calls and rate limit issues
 */

import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';

export interface GmailAuthResult {
  success: boolean;
  needsReauth: boolean;
  errorType?: 'no_tokens' | 'expired_tokens' | 'invalid_tokens' | 'missing_refresh_token' | 'api_error';
  message: string;
  oauth2Client?: any;
  gmail?: any;
}

export class SmartGmailAuth {
  /**
   * Get authenticated Gmail client with smart error handling
   */
  static async getAuthenticatedGmailClient(userId: string): Promise<GmailAuthResult> {
    try {
      const adminDb = getAdminDb();
      if (!adminDb) {
        return {
          success: false,
          needsReauth: false,
          errorType: 'api_error',
          message: 'Database not available'
        };
      }

      // Get user data
      const userDocRef = adminDb.collection('users').doc(userId);
      const userDocSnap = await userDocRef.get();
      
      if (!userDocSnap.exists) {
        return {
          success: false,
          needsReauth: true,
          errorType: 'no_tokens',
          message: 'User not found'
        };
      }

      const userData = userDocSnap.data();
      const { accessToken, refreshToken, expiryDate } = userData?.googleTokens || {};

      // Check if user has connected Gmail
      if (!userData?.gmailConnected) {
        return {
          success: false,
          needsReauth: false,
          errorType: 'no_tokens',
          message: 'User has never connected Gmail'
        };
      }

      // Check if access token exists
      if (!accessToken) {
        return {
          success: false,
          needsReauth: true,
          errorType: 'no_tokens',
          message: 'No Gmail access token found'
        };
      }

      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken || undefined,
      });

      // Check if token is expired
      const now = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
      const isExpired = expiryDate && (expiryDate - bufferTime) < now;

      // If token is expired or about to expire
      if (isExpired) {
        if (refreshToken) {
          try {
            console.log('SmartGmailAuth: Refreshing expired token for user:', userId);
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);
            
            // Update tokens in Firestore
            await userDocRef.set({
              googleTokens: {
                accessToken: credentials.access_token,
                refreshToken: credentials.refresh_token || refreshToken,
                expiryDate: credentials.expiry_date,
                scope: userData?.googleTokens?.scope || ''
              },
            }, { merge: true });
            
            console.log('SmartGmailAuth: Token refreshed successfully for user:', userId);
          } catch (refreshError: any) {
            console.error('SmartGmailAuth: Token refresh failed for user:', userId, refreshError);
            return {
              success: false,
              needsReauth: true,
              errorType: 'invalid_tokens',
              message: 'Token refresh failed - re-authentication required'
            };
          }
        } else {
          return {
            success: false,
            needsReauth: true,
            errorType: 'missing_refresh_token',
            message: 'Access token expired and no refresh token available - re-authentication required'
          };
        }
      }

      // Create Gmail client
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      return {
        success: true,
        needsReauth: false,
        message: 'Gmail authentication successful',
        oauth2Client,
        gmail
      };

    } catch (error: any) {
      console.error('SmartGmailAuth: Unexpected error:', error);
      return {
        success: false,
        needsReauth: true,
        errorType: 'api_error',
        message: 'Unexpected authentication error'
      };
    }
  }

  /**
   * Test Gmail API access with minimal API call
   */
  static async testGmailAccess(userId: string): Promise<GmailAuthResult> {
    const authResult = await this.getAuthenticatedGmailClient(userId);
    
    if (!authResult.success) {
      return authResult;
    }

    try {
      // Make minimal API call to test access
      await authResult.gmail!.users.getProfile({ userId: 'me' });
      
      return {
        ...authResult,
        message: 'Gmail API access verified'
      };
    } catch (apiError: any) {
      console.error('SmartGmailAuth: API test failed:', apiError);
      
      let errorType: GmailAuthResult['errorType'] = 'api_error';
      let needsReauth = true;
      
      if (apiError.status === 401 || apiError.code === 401) {
        errorType = 'invalid_tokens';
      } else if (apiError.status === 403 || apiError.code === 403) {
        errorType = 'invalid_tokens';
      } else if (apiError.status === 429 || apiError.code === 429) {
        errorType = 'api_error';
        needsReauth = false; // Rate limit doesn't mean reauth needed
      }

      return {
        success: false,
        needsReauth,
        errorType,
        message: `Gmail API test failed: ${apiError.message}`
      };
    }
  }

  /**
   * Get user's Gmail email address (cached to avoid API calls)
   */
  static async getUserGmailEmail(userId: string): Promise<string | null> {
    try {
      const adminDb = getAdminDb();
      if (!adminDb) return null;

      const userDocRef = adminDb.collection('users').doc(userId);
      const userDocSnap = await userDocRef.get();
      
      if (!userDocSnap.exists) return null;

      const userData = userDocSnap.data();
      return userData?.email || null;
    } catch (error) {
      console.error('SmartGmailAuth: Error getting user email:', error);
      return null;
    }
  }
}
