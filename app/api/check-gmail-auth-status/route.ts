import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

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
    const { accessToken, refreshToken, expiresAt } = userData?.googleTokens || {};

    // Check if tokens exist and are not expired
    if (!accessToken || !refreshToken) {
      return NextResponse.json({ 
        needsReauth: true, 
        message: 'No Gmail tokens found' 
      }, { status: 401 });
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    if (expiresAt && (expiresAt - bufferTime) < now) {
      return NextResponse.json({ 
        needsReauth: true, 
        message: 'Gmail tokens expired' 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      needsReauth: false, 
      message: 'Gmail authentication valid' 
    });

  } catch (error) {
    console.error('Error checking Gmail auth status:', error);
    return NextResponse.json({ 
      needsReauth: true, 
      message: 'Error checking authentication status' 
    }, { status: 500 });
  }
} 