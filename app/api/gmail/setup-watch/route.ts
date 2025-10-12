import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';

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

    // Get user's Gmail tokens from Firestore (using existing pattern)
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

    // Set up OAuth2 client (using existing pattern)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
    });

    // Check if token needs refresh (using existing logic)
    if (expiryDate && expiryDate < Date.now()) {
      if (refreshToken) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(credentials);
          
          // Update tokens in Firestore (using existing pattern)
          await userDocRef.set({
            googleTokens: {
              accessToken: credentials.access_token,
              refreshToken: credentials.refresh_token || refreshToken,
              expiryDate: credentials.expiry_date,
            },
          }, { merge: true });
          
          console.log('Gmail Watch setup: Access token refreshed for user:', userId);
        } catch (refreshError) {
          console.error('Gmail Watch setup: Error refreshing token:', refreshError);
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

    // Create Gmail API client (using existing pattern)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Set up Gmail Watch for push notifications
    try {
      // Use a shared Pub/Sub topic for all users (simpler setup)
      // Gmail will automatically create this topic if it doesn't exist
      const topicName = `projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/topics/gmail-notifications`;
      
      console.log('Gmail Watch setup: Setting up watch for user:', userId, 'with topic:', topicName);

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

      // Store watch information in Firestore for management
      await userDocRef.set({
        gmailWatch: {
          historyId: watchResponse.data.historyId,
          expiration: watchResponse.data.expiration,
          topicName: topicName,
          setupDate: new Date().toISOString(),
          isActive: true,
        },
      }, { merge: true });

      console.log('Gmail Watch setup: Successfully set up watch for user:', userId);
      
      return NextResponse.json({
        success: true,
        message: 'Gmail push notifications enabled',
        watchData: {
          historyId: watchResponse.data.historyId,
          expiration: watchResponse.data.expiration,
        }
      });

    } catch (watchError: any) {
      console.error('Gmail Watch setup: Error setting up watch:', watchError);
      
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
    console.error('Gmail Watch setup: Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
