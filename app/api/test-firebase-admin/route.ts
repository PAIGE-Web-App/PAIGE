import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing Firebase Admin SDK...');
    
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        error: 'Firebase Admin SDK not initialized' 
      }, { status: 500 });
    }
    
    console.log('✅ Firebase Admin SDK initialized successfully');
    
    // Test a simple Firestore operation
    const testRef = adminDb.collection('test').doc('test');
    await testRef.set({ test: 'data', timestamp: new Date() });
    
    console.log('✅ Firestore write successful');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Firebase Admin SDK working correctly' 
    });
    
  } catch (error: any) {
    console.error('❌ Firebase Admin SDK test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
