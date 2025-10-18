import { NextRequest, NextResponse } from 'next/server';
import { sendWeeklyTodoDigest } from '@/lib/emailIntegrations';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expectedToken = process.env.CRON_SECRET || 'test-secret-123';
    
    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Weekly todo digest cron job triggered');
    
    // Get all users who have todo items
    const { adminDb } = await import('@/lib/firebaseAdmin');
    
    const usersSnapshot = await adminDb.collection('users').get();
    let successCount = 0;
    let errorCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Only send to users with email addresses
        if (!userData.email) {
          console.log(`Skipping user ${userId} - no email address`);
          continue;
        }
        
        await sendWeeklyTodoDigest(userId);
        successCount++;
        console.log(`✅ Weekly digest sent to: ${userData.email}`);
        
        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to send weekly digest to user ${userDoc.id}:`, error);
      }
    }
    
    console.log(`📊 Weekly digest cron completed: ${successCount} sent, ${errorCount} errors`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Weekly digest sent to ${successCount} users`,
      stats: { successCount, errorCount }
    });
    
  } catch (error) {
    console.error('❌ Weekly digest cron job failed:', error);
    return NextResponse.json({ 
      error: 'Failed to process weekly digest cron job' 
    }, { status: 500 });
  }
}