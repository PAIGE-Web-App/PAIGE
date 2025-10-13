import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { google } from 'googleapis';

/**
 * ROBUST Gmail Auth Status Check
 * 
 * This endpoint provides a more reliable Gmail authentication check by:
 * 1. Checking stored tokens (fast, no API calls)
 * 2. Optionally making a minimal Gmail API call to verify tokens work
 * 3. Using smart caching to prevent excessive API calls
 * 4. Providing detailed error information for debugging
 */

export async function POST(req: NextRequest) {
  try {
    const { userId, force, testApiCall = false } = await req.json();

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
    const { accessToken, refreshToken, expiryDate, scope } = userData?.googleTokens || {};

    // Check if user has ever connected Gmail
    if (!userData?.gmailConnected) {
      return NextResponse.json({ 
        needsReauth: false, 
        message: 'User has never connected Gmail',
        checkType: 'stored_tokens_only'
      });
    }

    // Check if access token exists
    if (!accessToken) {
      return NextResponse.json({ 
        needsReauth: true, 
        message: 'No Gmail access token found',
        checkType: 'stored_tokens_only'
      }, { status: 401 });
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    if (expiryDate && (expiryDate - bufferTime) < now) {
      return NextResponse.json({ 
        needsReauth: true, 
        message: 'Gmail tokens expired',
        checkType: 'stored_tokens_only',
        expiryDate: new Date(expiryDate),
        currentTime: new Date(now)
      }, { status: 401 });
    }

    // Check if gmail.modify scope is present
    const { GMAIL_SCOPES } = await import('@/lib/gmailScopes');
    if (!scope?.includes(GMAIL_SCOPES.MODIFY)) {
      return NextResponse.json({ 
        needsReauth: true, 
        message: 'Missing required Gmail permissions - re-authentication required',
        checkType: 'stored_tokens_only'
      }, { status: 401 });
    }

    // If testApiCall is requested, make a minimal Gmail API call to verify tokens work
    if (testApiCall || force) {
      try {
        // Check cache to prevent excessive API calls
        const cacheKey = `gmail_auth_test_${userId}`;
        const cached = userData?.gmailAuthCache || {};
        const lastTest = cached.lastTestTime || 0;
        const testInterval = 5 * 60 * 1000; // 5 minutes
        
        if (!force && (now - lastTest) < testInterval) {
          console.log('Gmail auth test: Using cached result for user:', userId);
          return NextResponse.json({ 
            needsReauth: false, 
            message: 'Gmail authentication valid (cached)',
            checkType: 'cached_api_test',
            lastTestTime: new Date(lastTest)
          });
        }

        // Make minimal Gmail API call to verify tokens work
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
        
        // Make minimal API call - just get profile (very lightweight)
        await gmail.users.getProfile({ userId: 'me' });

        // Update cache with successful test
        await userDocRef.set({
          gmailAuthCache: {
            lastTestTime: now,
            lastTestResult: 'success'
          }
        }, { merge: true });

        console.log('Gmail auth test: API call successful for user:', userId);
        return NextResponse.json({ 
          needsReauth: false, 
          message: 'Gmail authentication valid (verified with API)',
          checkType: 'api_verified',
          lastTestTime: new Date(now)
        });

      } catch (apiError: any) {
        console.error('Gmail auth test: API call failed for user:', userId, apiError);
        
        // Update cache with failed test
        await userDocRef.set({
          gmailAuthCache: {
            lastTestTime: now,
            lastTestResult: 'failed',
            lastError: apiError.message
          }
        }, { merge: true });

        // Determine the specific error type
        let errorType = 'unknown';
        let needsReauth = true;
        
        if (apiError.status === 401 || apiError.code === 401) {
          errorType = 'invalid_credentials';
        } else if (apiError.status === 403 || apiError.code === 403) {
          errorType = 'insufficient_permissions';
        } else if (apiError.status === 429 || apiError.code === 429) {
          errorType = 'rate_limit';
          needsReauth = false; // Rate limit doesn't mean reauth needed
        }

        return NextResponse.json({ 
          needsReauth,
          message: `Gmail API test failed: ${apiError.message}`,
          checkType: 'api_verified',
          errorType,
          lastTestTime: new Date(now),
          apiError: {
            status: apiError.status,
            code: apiError.code,
            message: apiError.message
          }
        }, { status: needsReauth ? 401 : 200 });
      }
    }

    // Default: return success based on stored tokens only
    return NextResponse.json({ 
      needsReauth: false, 
      message: 'Gmail authentication valid (stored tokens only)',
      checkType: 'stored_tokens_only',
      userData: userData
    });

  } catch (error) {
    console.error('Error checking Gmail auth status:', error);
    return NextResponse.json({ 
      needsReauth: true, 
      message: 'Error checking authentication status' 
    }, { status: 500 });
  }
}
