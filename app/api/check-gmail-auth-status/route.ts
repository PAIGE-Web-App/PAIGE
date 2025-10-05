import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId, force } = await req.json();

    if (!userId) {
      return NextResponse.json({ 
        needsReauth: false, 
        message: 'No user ID provided' 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        needsReauth: false, 
        message: 'Database not available' 
      }, { status: 500 });
    }

    // Get user's Gmail tokens from Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      return NextResponse.json({ 
        needsReauth: true, 
        message: 'User not found' 
      }, { status: 404 });
    }

    const userData = userDocSnap.data();
    console.log('Gmail auth check: User data for', userId, ':', {
      hasGoogleTokens: !!userData?.googleTokens,
      googleTokens: userData?.googleTokens,
      gmailConnected: userData?.gmailConnected
    });
    
    const { accessToken, refreshToken, expiryDate } = userData?.googleTokens || {};

    // Check if user has ever connected Gmail (gmailConnected flag)
    if (!userData?.gmailConnected) {
      console.log('Gmail auth check: User has never connected Gmail:', userId);
      return NextResponse.json({ 
        needsReauth: false, 
        message: 'User has never connected Gmail' 
      });
    }

    // Check if access token exists (refresh token is optional for Firebase popup flow)
    if (!accessToken) {
      console.log('Gmail auth check: No access token found for user who previously connected Gmail:', userId);
      return NextResponse.json({ 
        needsReauth: true, 
        message: 'No Gmail access token found' 
      }, { status: 401 });
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    if (expiryDate && (expiryDate - bufferTime) < now) {
      console.log('Gmail auth check: Token expired for user:', userId, 'Expiry:', new Date(expiryDate), 'Now:', new Date(now));
      return NextResponse.json({ 
        needsReauth: true, 
        message: 'Gmail tokens expired' 
      }, { status: 401 });
    }

    console.log('Gmail auth check: Valid tokens for user:', userId, 'Expiry:', expiryDate ? new Date(expiryDate) : 'No expiry');

    // Test actual Gmail API access with a lightweight call
    try {
      const { google } = await import('googleapis');
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken || undefined,
      });

      // Make a Gmail API call to test actual access - test both read and send permissions
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Test read access
      await gmail.users.getProfile({ userId: 'me' });
      
      // Test send access by trying to create a minimal test message (requires gmail.send scope)
      try {
        // Create a minimal test message to check send permissions
        const testMessage = [
          'To: test@example.com',
          'From: test@example.com', 
          'Subject: Test',
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          'Test message for permission check'
        ].join('\n');
        
        const encodedMessage = Buffer.from(testMessage).toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        // Try to send (this will fail but tell us about permissions)
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        });
        
        console.log('Gmail auth check: Gmail read and send access confirmed for user:', userId);
        return NextResponse.json({ 
          needsReauth: false, 
          message: 'Gmail authentication valid' 
        });
      } catch (sendError: any) {
        console.log('Gmail auth check: Send access test failed for user:', userId, 'Error:', sendError.message, 'Status:', sendError.status);
        
        // If we can read but can't send, we need re-auth
        if (sendError.message?.includes('insufficient') || 
            sendError.message?.includes('permission') ||
            sendError.message?.includes('forbidden') ||
            sendError.message?.includes('403') ||
            sendError.message?.includes('Insufficient Permission') ||
            sendError.status === 403) {
          console.log('Gmail auth check: Gmail read access OK but send access denied for user:', userId);
          return NextResponse.json({ 
            needsReauth: true, 
            message: 'Gmail send permissions missing - re-authentication required' 
          }, { status: 401 });
        }
        
        // For other errors (like invalid recipient), log them but don't require re-auth
        console.log('Gmail auth check: Non-permission error in send test, not requiring re-auth:', sendError.message);
        throw sendError; // Re-throw other errors
      }
    } catch (apiError: any) {
      console.log('Gmail auth check: Gmail API test failed for user:', userId, 'Error:', apiError.message);
      
      // If the API call fails, it's likely an authentication issue
      if (apiError.message?.includes('invalid_grant') || 
          apiError.message?.includes('invalid_token') ||
          apiError.message?.includes('unauthorized') ||
          apiError.message?.includes('forbidden') ||
          apiError.message?.includes('Insufficient Permission') ||
          apiError.message?.includes('insufficient') ||
          apiError.message?.includes('permission')) {
        console.log('Gmail auth check: Gmail API access failed - re-authentication required for user:', userId);
        return NextResponse.json({ 
          needsReauth: true, 
          message: 'Gmail API access failed - re-authentication required' 
        }, { status: 401 });
      }
      
      // For other errors (network, quota, etc.), don't require re-auth
      console.log('Gmail auth check: Non-auth API error, not requiring re-auth:', apiError.message);
      return NextResponse.json({ 
        needsReauth: false, 
        message: 'Gmail authentication valid (API test failed due to non-auth issue)' 
      });
    }

  } catch (error) {
    console.error('Error checking Gmail auth status:', error);
    return NextResponse.json({ 
      needsReauth: true, 
      message: 'Error checking authentication status' 
    }, { status: 500 });
  }
} 