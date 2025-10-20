import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { google } from 'googleapis';

/**
 * Gmail Auth Diagnostic Endpoint
 * 
 * This endpoint provides detailed diagnostics for Gmail authentication issues
 * without making excessive API calls or hitting rate limits.
 * 
 * Features:
 * - Analyzes stored tokens vs actual API functionality
 * - Provides specific error categorization
 * - Uses minimal API calls with smart caching
 * - Identifies the root cause of "Invalid Credentials" errors
 */

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ 
        success: false,
        message: 'No user ID provided' 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        success: false,
        message: 'Database not available' 
      }, { status: 500 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      return NextResponse.json({ 
        success: false,
        message: 'User not found' 
      }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken, expiryDate, scope } = userData?.googleTokens || {};

    // Diagnostic results
    const diagnostics: {
      userId: string;
      timestamp: string;
      storedTokens: any;
      userSettings: any;
      gmailWatch: any;
      recommendations: string[];
      apiTest?: any;
      gmailWatchStatus?: any;
    } = {
      userId,
      timestamp: new Date().toISOString(),
      storedTokens: {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasExpiryDate: !!expiryDate,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isExpired: expiryDate ? (expiryDate < Date.now()) : false,
        scope: scope || 'No scope stored'
      },
      userSettings: {
        gmailConnected: !!userData?.gmailConnected,
        email: userData?.email || 'No email stored'
      },
      gmailWatch: userData?.gmailWatch || null,
      recommendations: [] as string[]
    };

    // Check if user has connected Gmail
    if (!userData?.gmailConnected) {
      diagnostics.recommendations.push('User has never connected Gmail - no action needed');
      return NextResponse.json({ 
        success: true,
        diagnostics,
        summary: 'User has never connected Gmail'
      });
    }

    // Check if tokens exist
    if (!accessToken) {
      diagnostics.recommendations.push('No access token found - user needs to re-authenticate');
      return NextResponse.json({ 
        success: true,
        diagnostics,
        summary: 'Missing access token - re-authentication required'
      });
    }

    // Check if tokens are expired
    if (expiryDate && expiryDate < Date.now()) {
      diagnostics.recommendations.push('Tokens are expired - user needs to re-authenticate');
      return NextResponse.json({ 
        success: true,
        diagnostics,
        summary: 'Expired tokens - re-authentication required'
      });
    }

    // Check scopes
    const { GMAIL_SCOPES } = await import('@/lib/gmailScopes');
    const hasRequiredScopes = scope?.includes(GMAIL_SCOPES.READONLY) && scope?.includes(GMAIL_SCOPES.SEND);
    if (!hasRequiredScopes) {
      diagnostics.recommendations.push('Missing required Gmail scopes (gmail.readonly and gmail.send) - re-authentication required');
      return NextResponse.json({ 
        success: true,
        diagnostics,
        summary: 'Missing required scopes - re-authentication required'
      });
    }

    // If we get here, stored tokens look valid
    diagnostics.recommendations.push('Stored tokens appear valid - issue likely with actual API usage');

    // OPTIONAL: Make a minimal API call to verify tokens work (only if explicitly requested)
    // This is disabled by default to prevent rate limits
    const testApiCall = true; // Set to true only for debugging
    
    if (testApiCall) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken || undefined,
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Minimal API call - just get profile
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        diagnostics.apiTest = {
          success: true,
          emailAddress: profile.data.emailAddress,
          messagesTotal: profile.data.messagesTotal,
          threadsTotal: profile.data.threadsTotal
        };
        
        diagnostics.recommendations.push('API test successful - tokens work correctly');
        
      } catch (apiError: any) {
        diagnostics.apiTest = {
          success: false,
          error: {
            status: apiError.status,
            code: apiError.code,
            message: apiError.message
          }
        };
        
        // Categorize the error
        if (apiError.status === 401 || apiError.code === 401) {
          diagnostics.recommendations.push('API test failed: Invalid credentials - tokens are invalid for actual API usage');
        } else if (apiError.status === 403 || apiError.code === 403) {
          diagnostics.recommendations.push('API test failed: Insufficient permissions - scope mismatch');
        } else if (apiError.status === 429 || apiError.code === 429) {
          diagnostics.recommendations.push('API test failed: Rate limit - tokens are valid but quota exceeded');
        } else {
          diagnostics.recommendations.push(`API test failed: ${apiError.message}`);
        }
      }
    } else {
      diagnostics.apiTest = {
        skipped: true,
        reason: 'API test disabled to prevent rate limits - stored tokens appear valid'
      };
    }

    // Check Gmail Watch status
    if (userData?.gmailWatch) {
      const watch = userData.gmailWatch;
      diagnostics.gmailWatchStatus = {
        isActive: watch.isActive,
        useOptimizedWebhook: watch.useOptimizedWebhook,
        setupDate: watch.setupDate,
        expiration: watch.expiration,
        historyId: watch.historyId,
        lastUpdated: watch.lastUpdated
      };
      
      if (!watch.isActive) {
        diagnostics.recommendations.push('Gmail Watch is disabled - re-enable for push notifications');
      }
      
      if (watch.expiration && new Date(watch.expiration) < new Date()) {
        diagnostics.recommendations.push('Gmail Watch has expired - needs to be renewed');
      }
    }

    return NextResponse.json({ 
      success: true,
      diagnostics,
      summary: diagnostics.recommendations.length > 0 ? 
        diagnostics.recommendations[0] : 
        'Gmail authentication appears to be working correctly'
    });

  } catch (error: any) {
    console.error('Gmail auth diagnostic error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Diagnostic failed',
      error: error.message
    }, { status: 500 });
  }
}
