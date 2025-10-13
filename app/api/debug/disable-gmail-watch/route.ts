import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * Debug endpoint to temporarily disable Gmail Watch API
 * This can help determine if Gmail Watch is causing rate limit issues
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId required' 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database not available' 
      }, { status: 500 });
    }

    // Disable Gmail Watch by setting isActive to false
    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.update({
      'gmailWatch.isActive': false,
      'gmailWatch.disabledAt': new Date().toISOString(),
      'gmailWatch.disabledReason': 'Rate limit debugging'
    });

    return NextResponse.json({
      success: true,
      message: 'Gmail Watch API disabled for debugging',
      note: 'This will stop push notifications but may help with rate limits'
    });

  } catch (error: any) {
    console.error('Error disabling Gmail Watch:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
