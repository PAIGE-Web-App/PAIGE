import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { GmailQuotaService } from '@/utils/gmailQuotaService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const testAction = searchParams.get('action') || 'check';

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId parameter is required' 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database not available' 
      }, { status: 500 });
    }

    // Get user document to check current quotas
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();
    
    if (!userDocSnap.exists) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    const userData = userDocSnap.data();
    const currentQuotas = userData?.gmailQuotas || null;

    let result: any = {
      userId,
      currentQuotas,
      testAction,
      timestamp: new Date().toISOString()
    };

    switch (testAction) {
      case 'check':
        // Test quota check functions
        const emailQuotaCheck = await GmailQuotaService.canSendEmail(userId);
        const importQuotaCheck = await GmailQuotaService.canImportMessages(userId, 5);
        
        result.emailQuota = emailQuotaCheck;
        result.importQuota = importQuotaCheck;
        break;

      case 'increment-email':
        // Test incrementing email sent
        await GmailQuotaService.incrementEmailSent(userId);
        result.message = 'Email sent count incremented';
        break;

      case 'increment-import':
        // Test incrementing messages imported
        await GmailQuotaService.incrementMessagesImported(userId, 5);
        result.message = 'Messages imported count incremented by 5';
        break;

      case 'reset':
        // Test resetting all quotas
        await GmailQuotaService.resetAllQuotas(userId);
        result.message = 'All Gmail quotas reset';
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: check, increment-email, increment-import, or reset' 
        }, { status: 400 });
    }

    // Get updated quotas after action
    const updatedUserDoc = await userDocRef.get();
    result.updatedQuotas = updatedUserDoc.data()?.gmailQuotas || null;

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Gmail quota test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
