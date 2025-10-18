import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (disabled for testing)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'test-secret-123'; // Fallback for testing
    
    // Temporarily disable auth for testing
    // if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const job = searchParams.get('job');
    
    console.log(`🕐 Cron job triggered: ${job || 'unknown'}`);
    
    switch (job) {
      case 'weekly-todo-digest':
        // Import and call the function directly instead of making HTTP request
        const { sendWeeklyTodoDigest } = await import('@/lib/emailIntegrations');
        const { adminDb } = await import('@/lib/firebaseAdmin');
        
        console.log('🕐 Weekly todo digest cron job triggered');
        
        // Get all users who have todo items
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
          job: 'weekly-todo-digest',
          message: `Weekly digest sent to ${successCount} users`,
          stats: { successCount, errorCount }
        });
        
      case 'missed-deadline-check':
        // Check for missed deadlines and send reminders
        const { sendMissedDeadlineReminders } = await import('@/lib/emailIntegrations');
        
        console.log('🔍 Missed deadline check cron job triggered');
        await sendMissedDeadlineReminders();
        
        return NextResponse.json({
          success: true,
          job: 'missed-deadline-check',
          message: 'Missed deadline check completed'
        });
        
      case 'budget-payment-overdue-check':
        // Check for overdue budget payments and send reminders
        const { sendBudgetPaymentOverdueReminders } = await import('@/lib/emailIntegrations');
        
        console.log('🔍 Budget payment overdue check cron job triggered');
        await sendBudgetPaymentOverdueReminders();
        
        return NextResponse.json({
          success: true,
          job: 'budget-payment-overdue-check',
          message: 'Budget payment overdue check completed'
        });
        
      case 'budget-creation-reminder':
        // Check for users who need budget creation reminders
        const { sendBudgetCreationReminders } = await import('@/lib/emailIntegrations');
        
        console.log('🔍 Budget creation reminder cron job triggered');
        await sendBudgetCreationReminders();
        
        return NextResponse.json({
          success: true,
          job: 'budget-creation-reminder',
          message: 'Budget creation reminder check completed'
        });
        
      case 'daily-credit-check':
        // Future: Check for low credits and send alerts
        return NextResponse.json({
          success: true,
          job: 'daily-credit-check',
          message: 'Daily credit check not yet implemented'
        });
        
      case 'wedding-reminders':
        // Future: Send wedding milestone reminders
        return NextResponse.json({
          success: true,
          job: 'wedding-reminders',
          message: 'Wedding reminders not yet implemented'
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown cron job',
          availableJobs: ['weekly-todo-digest', 'missed-deadline-check', 'budget-payment-overdue-check', 'budget-creation-reminder', 'daily-credit-check', 'wedding-reminders']
        });
    }
    
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    return NextResponse.json({ 
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
