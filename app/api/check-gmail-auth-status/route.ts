import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { GMAIL_SCOPES } from '@/lib/gmailScopes';

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

    // Check if required scopes are present (gmail.readonly and gmail.send)
    const scope = userData?.googleTokens?.scope || '';
    // GMAIL_SCOPES is now imported at the top
    if (!scope.includes(GMAIL_SCOPES.READONLY) || !scope.includes(GMAIL_SCOPES.SEND)) {
      console.log('Gmail auth check: Missing required Gmail scopes for user:', userId);
      return NextResponse.json({ 
        needsReauth: true, 
        message: 'Missing required Gmail permissions - re-authentication required' 
      }, { status: 401 });
    }

    console.log('Gmail auth check: Valid tokens and scopes for user:', userId, 'Expiry:', expiryDate ? new Date(expiryDate) : 'No expiry');
    
    // OPTIMIZATION: Add smart caching to prevent excessive API calls
    const cacheKey = `gmail_auth_${userId}`;
    const cached = userData?.gmailAuthCache || {};
    const lastCheck = cached.lastCheckTime || 0;
    const checkInterval = 15 * 60 * 1000; // 15 minutes cache
    
    // Reuse 'now' from earlier token expiry check
    if (!force && (now - lastCheck) < checkInterval) {
      console.log('Gmail auth check: Using cached result for user:', userId);
      return NextResponse.json({ 
        needsReauth: false, 
        message: 'Gmail authentication valid (cached)',
        userData: userData,
        cached: true,
        lastCheckTime: new Date(lastCheck)
      });
    }

    // Update cache timestamp
    await userDocRef.set({
      gmailAuthCache: {
        lastCheckTime: now,
        lastCheckResult: 'success'
      }
    }, { merge: true });

    return NextResponse.json({ 
      needsReauth: false, 
      message: 'Gmail authentication valid',
      userData: userData, // Include full user data so UI can check gmailWatch
      cached: false,
      lastCheckTime: new Date(now)
    });

  } catch (error) {
    console.error('Error checking Gmail auth status:', error);
    return NextResponse.json({ 
      needsReauth: true, 
      message: 'Error checking authentication status' 
    }, { status: 500 });
  }
} 