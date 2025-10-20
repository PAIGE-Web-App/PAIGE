import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from './firebaseAdmin';

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  try {
    // Try to authenticate using Authorization header first (for API calls)
    const authHeader = request.headers.get('authorization');
    let decodedToken = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
      } catch (error) {
        console.error('Error verifying ID token:', error);
      }
    }

    // If no Authorization header or token verification failed, try session cookie
    if (!decodedToken) {
      const sessionCookie = request.cookies.get('__session')?.value;
      if (sessionCookie) {
        try {
          decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
        } catch (error) {
          console.error('Error verifying session cookie:', error);
        }
      }
    }

    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Call the handler with the authenticated user
    return handler(request, decodedToken);
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

export async function requireAuth(request: NextRequest) {
  try {
    // Try to authenticate using Authorization header first (for API calls)
    const authHeader = request.headers.get('authorization');
    let decodedToken = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
        return { success: true, user: decodedToken };
      } catch (error) {
        console.error('Error verifying ID token:', error);
      }
    }

    // If no Authorization header or token verification failed, try session cookie
    if (!decodedToken) {
      const sessionCookie = request.cookies.get('__session')?.value;
      if (sessionCookie) {
        try {
          decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
          return { success: true, user: decodedToken };
        } catch (error) {
          console.error('Error verifying session cookie:', error);
        }
      }
    }

    return { success: false, error: 'Authentication required' };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}
