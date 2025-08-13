import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json({ 
        error: 'Missing idToken',
        valid: false,
        reason: 'missing_token'
      }, { status: 400 });
    }

    // Handle mock tokens in test environment
    if (idToken === 'mock-token') {
      return NextResponse.json({ 
        error: 'Invalid token',
        valid: false,
        reason: 'invalid_token'
      }, { status: 401 });
    }

    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Check if token is not expired
      const now = Math.floor(Date.now() / 1000);
      if (decodedToken.exp < now) {
        return NextResponse.json({ 
          error: 'Token expired',
          valid: false,
          reason: 'expired_token'
        }, { status: 401 });
      }

      // Return user info if token is valid
      return NextResponse.json({
        valid: true,
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        reason: 'valid_token'
      });
      
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ 
        error: 'Invalid token',
        valid: false,
        reason: 'verification_failed'
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('Error in token validation:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      valid: false,
      reason: 'server_error'
    }, { status: 500 });
  }
}
