import { NextRequest, NextResponse } from 'next/server';
import { sendBudgetCreationReminderEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { adminDb } = await import('@/lib/firebaseAdmin');
    
    console.log('🚀 Starting bulk budget creation reminder email campaign...');
    
    // Get all users
    const usersSnapshot = await adminDb.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.size} total users`);
    
    let eligibleUsers = 0;
    let emailsSent = 0;
    let errors = 0;
    const results = [];
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Check if user signed up more than 7 days ago
        const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
        if (createdAt >= sevenDaysAgo) {
          console.log(`⏭️  Skipping user ${userId} - signed up ${createdAt.toLocaleDateString()} (too recent)`);
          continue;
        }
        
        // Check if user has any budget items
        const budgetItemsSnapshot = await adminDb
          .collection(`users/${userId}/budgetItems`)
          .limit(1)
          .get();
        
        if (!budgetItemsSnapshot.empty) {
          console.log(`⏭️  Skipping user ${userId} - already has budget items`);
          continue;
        }
        
        // Check if user has email
        if (!userData.email) {
          console.log(`⏭️  Skipping user ${userId} - no email address`);
          continue;
        }
        
        eligibleUsers++;
        console.log(`📧 Sending budget reminder to ${userData.email} (${userData.userName || userData.displayName || 'User'})`);
        
        // Send the budget creation reminder email
        const success = await sendBudgetCreationReminderEmail(
          userData.email,
          userData.userName || userData.displayName || 'User',
          userId
        );
        
        if (success) {
          emailsSent++;
          results.push({
            userId,
            email: userData.email,
            userName: userData.userName || userData.displayName || 'User',
            status: 'sent',
            signedUpDate: createdAt.toLocaleDateString()
          });
          console.log(`✅ Email sent successfully to ${userData.email}`);
        } else {
          errors++;
          results.push({
            userId,
            email: userData.email,
            userName: userData.userName || userData.displayName || 'User',
            status: 'failed',
            signedUpDate: createdAt.toLocaleDateString()
          });
          console.log(`❌ Failed to send email to ${userData.email}`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errors++;
        console.error(`❌ Error processing user ${userDoc.id}:`, error);
        results.push({
          userId: userDoc.id,
          email: userDoc.data().email || 'unknown',
          userName: userDoc.data().userName || userDoc.data().displayName || 'User',
          status: 'error',
          error: error.message
        });
      }
    }
    
    console.log(`🎉 Bulk budget reminder campaign completed!`);
    console.log(`📊 Results: ${eligibleUsers} eligible users, ${emailsSent} emails sent, ${errors} errors`);
    
    return NextResponse.json({
      success: true,
      message: 'Bulk budget reminder campaign completed',
      stats: {
        totalUsers: usersSnapshot.size,
        eligibleUsers,
        emailsSent,
        errors
      },
      results: results.slice(0, 50) // Return first 50 results to avoid large response
    });
    
  } catch (error) {
    console.error('❌ Bulk budget reminder campaign failed:', error);
    return NextResponse.json(
      { error: 'Bulk campaign failed', details: error.message },
      { status: 500 }
    );
  }
}
