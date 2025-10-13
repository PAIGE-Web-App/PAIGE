import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * OPTIMIZED Gmail Watch Setup
 * 
 * This is the new default endpoint for setting up Gmail Watch API.
 * It automatically applies optimized settings to prevent rate limit issues.
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

    // Get user's Gmail tokens from Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const { accessToken, refreshToken, expiryDate } = userData?.googleTokens || {};

    // Check if user has Gmail connected
    if (!userData?.gmailConnected || !accessToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Gmail not connected. Please connect Gmail first.' 
      }, { status: 400 });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
    });

    // Check if token needs refresh
    if (expiryDate && expiryDate < Date.now()) {
      if (refreshToken) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(credentials);
          
          // Update tokens in Firestore
          await userDocRef.set({
            googleTokens: {
              accessToken: credentials.access_token,
              refreshToken: credentials.refresh_token || refreshToken,
              expiryDate: credentials.expiry_date,
            },
          }, { merge: true });
          
          console.log('Gmail Watch setup (Optimized): Access token refreshed for user:', userId);
        } catch (refreshError) {
          console.error('Gmail Watch setup (Optimized): Error refreshing token:', refreshError);
          return NextResponse.json({ 
            success: false, 
            message: 'Gmail access token expired. Please re-authorize Gmail access.' 
          }, { status: 401 });
        }
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Gmail access token expired. Please re-authorize Gmail access.' 
        }, { status: 401 });
      }
    }

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Set up Gmail Watch for push notifications with optimized settings
    try {
      // Use a shared Pub/Sub topic for all users (simpler setup)
      const topicName = `projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/topics/gmail-notifications`;
      
      console.log('Gmail Watch setup (Optimized): Setting up optimized watch for user:', userId, 'with topic:', topicName);

      // Import rate limit handler
      const { GmailRateLimitHandler } = await import('@/utils/gmailRateLimitHandler');

      // Set up Gmail Watch with rate limit handling
      const watchResponse = await GmailRateLimitHandler.executeWithRetry(async () => {
        return await gmail.users.watch({
          userId: 'me',
          requestBody: {
            topicName: topicName,
            labelIds: ['INBOX'], // Only watch INBOX for efficiency
            labelFilterBehavior: 'include',
          },
        });
      });

      // Store watch information with OPTIMIZED settings
      await userDocRef.set({
        gmailWatch: {
          historyId: watchResponse.data.historyId,
          expiration: watchResponse.data.expiration,
          topicName: topicName,
          setupDate: new Date().toISOString(),
          isActive: true,
          // OPTIMIZED SETTINGS - These prevent rate limit issues
          useOptimizedWebhook: true,
          maxMessagesPerWebhook: 3,
          processingDelayMs: 2000,
          optimizedSetup: true,
          setupVersion: '2.0'
        },
      }, { merge: true });

      console.log('Gmail Watch setup (Optimized): Successfully set up optimized watch for user:', userId);
      
      return NextResponse.json({
        success: true,
        message: 'Gmail push notifications enabled with optimized settings',
        watchData: {
          historyId: watchResponse.data.historyId,
          expiration: watchResponse.data.expiration,
          optimized: true,
          maxMessagesPerWebhook: 3,
          processingDelayMs: 2000
        }
      });

    } catch (watchError: any) {
      console.error('Gmail Watch setup (Optimized): Error setting up watch:', watchError);
      
      // Handle specific Gmail API errors
      if (watchError.code === 403) {
        return NextResponse.json({ 
          success: false, 
          message: 'Gmail API access denied. Please check permissions.' 
        }, { status: 403 });
      } else if (watchError.code === 404) {
        return NextResponse.json({ 
          success: false, 
          message: 'Gmail account not found.' 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to set up Gmail push notifications' 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Gmail Watch setup (Optimized): Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
