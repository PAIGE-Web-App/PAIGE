import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing environment variables');
    
    const envVars = {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI ? 'SET' : 'NOT SET',
      FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
      // Also check the actual values (redacted)
      GOOGLE_CLIENT_ID_VALUE: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
      GOOGLE_REDIRECT_URI_VALUE: process.env.GOOGLE_REDIRECT_URI,
    };

    return NextResponse.json({ 
      success: true, 
      message: 'Environment variables check',
      envVars
    });

  } catch (error: any) {
    console.error('❌ Env vars test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
