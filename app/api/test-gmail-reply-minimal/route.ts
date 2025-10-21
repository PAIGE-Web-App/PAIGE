import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb } from '../../../lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Minimal Gmail reply test...');
    
    const { userId } = await req.json();
    
    // Test Firebase Admin
    const userDoc = await adminDb.collection('users').doc(userId || 'test').get();
    console.log('✅ Firebase Admin working, user exists:', userDoc.exists);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Minimal Gmail reply test passed',
      userExists: userDoc.exists
    });
    
  } catch (error: any) {
    console.error('❌ Minimal Gmail reply test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
  }
}

