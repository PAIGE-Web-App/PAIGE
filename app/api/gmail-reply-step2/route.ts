import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Step 2: Adding Firebase Admin import');
    
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required.' 
      }, { status: 400 });
    }

    // Test if Firebase Admin import breaks it
    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        message: 'Firebase Admin not initialized' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Step 2: Firebase Admin import working',
      userId 
    });

  } catch (error: any) {
    console.error('❌ Step 2 error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
