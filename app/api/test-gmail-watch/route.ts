import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Gmail Watch Test: Starting diagnostic...');
    
    // Check environment variables
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    console.log('🧪 Project ID:', projectId);
    
    // Check admin database
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        error: 'Admin database not available' 
      }, { status: 500 });
    }
    
    // Check if we can access Firestore
    try {
      const testDoc = await adminDb.collection('users').limit(1).get();
      console.log('🧪 Firestore access: OK');
    } catch (error) {
      console.error('🧪 Firestore access error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Firestore access failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      diagnostics: {
        projectId,
        adminDbAvailable: !!adminDb,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('🧪 Gmail Watch Test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Test failed',
      details: error.message 
    }, { status: 500 });
  }
}
