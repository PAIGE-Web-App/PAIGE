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

    // Check if gmail.modify scope is present (required for Gmail Watch API)
    const scope = userData?.googleTokens?.scope || '';
    if (!scope.includes('https://www.googleapis.com/auth/gmail.modify')) {
      console.log('Gmail auth check: Missing gmail.modify scope for user:', userId);
      return NextResponse.json({ 
        needsReauth: true, 
        message: 'Missing required Gmail permissions - re-authentication required' 
      }, { status: 401 });
    }

    console.log('Gmail auth check: Valid tokens and scopes for user:', userId, 'Expiry:', expiryDate ? new Date(expiryDate) : 'No expiry');
    return NextResponse.json({ 
      needsReauth: false, 
      message: 'Gmail authentication valid',
      userData: userData // Include full user data so UI can check gmailWatch
    });

  } catch (error) {
    console.error('Error checking Gmail auth status:', error);
    return NextResponse.json({ 
      needsReauth: true, 
      message: 'Error checking authentication status' 
    }, { status: 500 });
  }
} 