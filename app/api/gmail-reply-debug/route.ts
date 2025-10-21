import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Gmail-reply-debug API called');
    
    // Test 1: Basic functionality
    console.log('✅ Test 1: Basic functionality works');
    
    // Test 2: Try importing Firebase Admin
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      console.log('✅ Test 2: Firebase Admin import works');
    } catch (error) {
      console.error('❌ Test 2: Firebase Admin import failed:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Firebase Admin import failed',
        details: error.message 
      }, { status: 500 });
    }
    
    // Test 3: Try importing GmailQuotaService
    try {
      const { GmailQuotaService } = await import('@/utils/gmailQuotaService');
      console.log('✅ Test 3: GmailQuotaService import works');
    } catch (error) {
      console.error('❌ Test 3: GmailQuotaService import failed:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'GmailQuotaService import failed',
        details: error.message 
      }, { status: 500 });
    }
    
    // Test 4: Try importing GmailAuthErrorHandler
    try {
      const { GmailAuthErrorHandler } = await import('@/utils/gmailAuthErrorHandler');
      console.log('✅ Test 4: GmailAuthErrorHandler import works');
    } catch (error) {
      console.error('❌ Test 4: GmailAuthErrorHandler import failed:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'GmailAuthErrorHandler import failed',
        details: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'All imports working correctly',
      tests: ['Basic functionality', 'Firebase Admin', 'GmailQuotaService', 'GmailAuthErrorHandler']
    });
    
  } catch (error: any) {
    console.error('❌ Gmail reply debug error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
