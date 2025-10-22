import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Step 5: Testing google import without OAuth2');
    
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required.' 
      }, { status: 400 });
    }

    // Test if just importing google breaks it (without using OAuth2)
    const gmail = google.gmail({ version: 'v1' });

    return NextResponse.json({ 
      success: true, 
      message: 'Step 5: Google Gmail API import working',
      userId 
    });

  } catch (error: any) {
    console.error('❌ Step 5 error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
