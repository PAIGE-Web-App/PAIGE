import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Checking environment variables in production');
    
    const envCheck = {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET (length: ' + process.env.GOOGLE_CLIENT_ID.length + ')' : 'NOT SET',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET (length: ' + process.env.GOOGLE_CLIENT_SECRET.length + ')' : 'NOT SET',
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'NOT SET',
      FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'SET (length: ' + process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length + ')' : 'NOT SET',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    };

    return NextResponse.json({ 
      success: true,
      message: 'Environment variables check',
      envCheck
    });

  } catch (error: any) {
    console.error('❌ Env check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
