import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the Firebase token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { action } = await request.json();

    if (action === 'simulate-downgrade') {
      // Set currentPeriodEnd to yesterday to trigger downgrade
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await adminDb.collection('users').doc(userId).update({
        'billing.subscription.currentPeriodEnd': yesterday,
        'billing.pendingDowngrade': {
          targetPlan: 'free',
          targetPlanName: 'Free',
          effectiveDate: yesterday.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
          }),
          createdAt: new Date()
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Downgrade simulation set. Refresh the page to see the warning.' 
      });
    }

    if (action === 'execute-downgrade') {
      console.log('🔄 Executing downgrade for user:', userId);
      
      // Actually execute the downgrade
      const userRef = adminDb.collection('users').doc(userId);
      const userSnap = await userRef.get();
      
      if (!userSnap.exists) {
        console.error('❌ User not found:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userData = userSnap.data();
      const pendingDowngrade = userData?.billing?.pendingDowngrade;
      
      console.log('📋 User data:', userData);
      console.log('📋 Pending downgrade:', pendingDowngrade);

      if (!pendingDowngrade) {
        console.error('❌ No pending downgrade found');
        return NextResponse.json({ error: 'No pending downgrade found' }, { status: 400 });
      }

      try {
        console.log('🔄 Updating user to free tier...');
        
        // Execute the downgrade
        await userRef.update({
          'credits.subscriptionTier': 'free',
          'credits.dailyCredits': 15, // Free tier daily credits
          'credits.updatedAt': new Date(),
          'billing.subscription.tier': 'free',
          'billing.subscription.status': 'active',
          'billing.subscription.updatedAt': new Date()
        });

        // Remove pending downgrade separately to ensure it's deleted
        await userRef.update({
          'billing.pendingDowngrade': FieldValue.delete()
        });

        console.log('✅ Downgrade executed successfully');
        
        return NextResponse.json({ 
          success: true, 
          message: 'Downgrade executed successfully! You are now on the Free plan.' 
        });
      } catch (updateError) {
        console.error('❌ Error updating user:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update user', 
          details: updateError.message 
        }, { status: 500 });
      }
    }

    if (action === 'reset-to-premium') {
      // Reset back to premium for testing
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      await adminDb.collection('users').doc(userId).update({
        'credits.subscriptionTier': 'premium',
        'credits.dailyCredits': 22,
        'credits.updatedAt': new Date(),
        'billing.subscription.tier': 'couple_premium',
        'billing.subscription.status': 'active',
        'billing.subscription.currentPeriodEnd': nextMonth,
        'billing.subscription.updatedAt': new Date(),
        'billing.pendingDowngrade': FieldValue.delete()
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Reset to Premium plan successfully!' 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in test downgrade:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
