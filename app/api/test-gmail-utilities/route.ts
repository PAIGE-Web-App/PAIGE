import { NextRequest, NextResponse } from 'next/server';
import { GmailQuotaService } from '@/utils/gmailQuotaService';
import { GmailAuthErrorHandler } from '@/utils/gmailAuthErrorHandler';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing Gmail utilities...');
    
    // Test GmailQuotaService
    const quotaCheck = await GmailQuotaService.canSendEmail('test-user');
    console.log('✅ GmailQuotaService test:', quotaCheck);
    
    // Test GmailAuthErrorHandler
    const errorResult = GmailAuthErrorHandler.handleErrorAndTriggerBanner(
      new Error('Test error'), 
      'Test context'
    );
    console.log('✅ GmailAuthErrorHandler test:', errorResult);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Gmail utilities working correctly',
      quotaCheck,
      errorResult
    });
    
  } catch (error: any) {
    console.error('❌ Gmail utilities test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
