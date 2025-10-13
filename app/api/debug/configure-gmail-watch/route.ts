import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * Configuration endpoint for Gmail Watch API
 * Allows switching between original and optimized webhook implementations
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, config } = await req.json();

    if (!userId || !config) {
      return NextResponse.json({ 
        error: 'userId and config are required' 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database not available' 
      }, { status: 500 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const gmailWatch = userData?.gmailWatch || {};

    // Update Gmail Watch configuration
    const updatedConfig = {
      ...gmailWatch,
      ...config,
      lastUpdated: new Date().toISOString()
    };

    await userDocRef.set({
      gmailWatch: updatedConfig
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Gmail Watch configuration updated',
      config: updatedConfig
    });

  } catch (error: any) {
    console.error('Error updating Gmail Watch configuration:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId parameter required' 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database not available' 
      }, { status: 500 });
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const gmailWatch = userData?.gmailWatch || {};

    return NextResponse.json({
      success: true,
      config: gmailWatch,
      recommendations: [
        'Set isActive: true to enable Gmail Watch',
        'Set useOptimizedWebhook: true to use the optimized version',
        'Set maxMessagesPerWebhook: 3 to limit processing',
        'Set processingDelayMs: 2000 to add delays between messages'
      ]
    });

  } catch (error: any) {
    console.error('Error getting Gmail Watch configuration:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
