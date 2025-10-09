import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ 
        error: 'No user ID provided' 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database not available' 
      }, { status: 500 });
    }

    // Get user's data from Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    const userData = userDocSnap.data();
    
    return NextResponse.json({
      userId,
      hasGoogleTokens: !!userData?.googleTokens,
      googleTokens: userData?.googleTokens,
      gmailConnected: userData?.gmailConnected,
      hasGmailScopes: userData?.googleTokens?.scope?.includes('gmail'),
      scope: userData?.googleTokens?.scope,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error debugging Gmail auth:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
}
