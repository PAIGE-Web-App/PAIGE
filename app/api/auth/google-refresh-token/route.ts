import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { refreshGoogleAccessToken } from '@/lib/googleTokenRefresh';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get current tokens from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const currentTokens = userData?.googleTokens;

    if (!currentTokens) {
      return NextResponse.json({ error: 'No Google tokens found' }, { status: 404 });
    }

    // Attempt to refresh the token
    const newTokens = await refreshGoogleAccessToken(userId, currentTokens);

    if (!newTokens) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token refresh failed. User needs to re-authenticate.' 
      }, { status: 401 });
    }

    // Return new access token
    return NextResponse.json({
      success: true,
      accessToken: newTokens.accessToken,
      email: newTokens.email,
      expiryDate: newTokens.expiryDate
    });

  } catch (error) {
    console.error('❌ Token refresh API error:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh token' 
    }, { status: 500 });
  }
}

