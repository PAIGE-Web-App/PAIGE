import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Step 1: Adding googleapis import');
    
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required.' 
      }, { status: 400 });
    }

    // Just return success - testing if googleapis import breaks it
    return NextResponse.json({ 
      success: true, 
      message: 'Step 1: googleapis import working',
      userId 
    });

  } catch (error: any) {
    console.error('❌ Step 1 error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
