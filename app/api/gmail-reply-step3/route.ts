import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb } from '@/lib/firebaseAdmin';
import { GmailQuotaService } from '@/utils/gmailQuotaService';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Step 3: Adding utility imports');
    
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required.' 
      }, { status: 400 });
    }

    // Test if utility imports break it
    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        message: 'Firebase Admin not initialized' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Step 3: Utility imports working',
      userId 
    });

  } catch (error: any) {
    console.error('❌ Step 3 error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
