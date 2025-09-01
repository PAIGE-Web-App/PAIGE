import { NextRequest, NextResponse } from 'next/server';
import { creditServiceAdmin } from '@/lib/creditServiceAdmin';
import { AIFeature, UserType, SubscriptionTier, getSubscriptionCredits } from '@/types/credits';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    // Get user credits
    const credits = await creditServiceAdmin.getUserCredits(userId);
    
    if (!credits) {
      return NextResponse.json({ error: 'User credits not found' }, { status: 404 });
    }
    
    return NextResponse.json(credits);
  } catch (error) {
    console.error('Error getting user credits:', error);
    return NextResponse.json(
      { error: 'Failed to get user credits' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  let userId: string = '';
  let action: string = '';
  let amount: number = 0;
  let reason: string = '';
  let newUserType: UserType = 'couple';
  let newTier: SubscriptionTier = 'free';
  
  try {
    const resolvedParams = await params;
    userId = resolvedParams.userId;
    const body = await request.json();
    ({ action, amount, reason, newUserType, newTier } = body);
    
    let success = false;
    
    switch (action) {
      case 'add':
        success = await creditServiceAdmin.addCredits(
          userId,
          amount,
          'bonus',
          reason,
          { adminAction: true, timestamp: new Date().toISOString() }
        );
        break;
        
      case 'subtract':
        success = await creditServiceAdmin.addCredits(
          userId,
          -amount,
          'bonus',
          reason,
          { adminAction: true, timestamp: new Date().toISOString() }
        );
        break;
        
      case 'set':
        // Set bonus credits to the specified amount (ignores daily credits)
        const currentCredits = await creditServiceAdmin.getUserCredits(userId);
        
        if (currentCredits) {
          // Calculate how many bonus credits to add/subtract to reach the target amount
          const currentBonusCredits = currentCredits.bonusCredits || 0;
          const difference = amount - currentBonusCredits;
          
          if (difference !== 0) {
            success = await creditServiceAdmin.addCredits(
              userId,
              difference,
              'bonus',
              reason,
              { adminAction: true, timestamp: new Date().toISOString() }
            );
          } else {
            success = true; // No change needed
          }
        } else {
          // User doesn't have credits yet, initialize them
          const newCredits = await creditServiceAdmin.initializeUserCredits(
            userId,
            'couple', // Default user type
            'free'    // Default tier
          );
          
          if (newCredits) {
            // Add the specified bonus credits
            success = await creditServiceAdmin.addCredits(
              userId,
              amount,
              'bonus',
              reason,
              { adminAction: true, timestamp: new Date().toISOString() }
            );
          }
        }
        break;
        
      case 'initialize':
        // Initialize credits for a new user
        const newCredits = await creditServiceAdmin.initializeUserCredits(
          userId,
          newUserType,
          newTier
        );
        success = !!newCredits;
        break;
        
      case 'repair':
        // Repair corrupted credits
        success = await creditServiceAdmin.repairCorruptedCredits(userId);
        break;
        
      case 'reset_daily':
        // Reset daily credits to tier default
        const currentCreditsForReset = await creditServiceAdmin.getUserCredits(userId);
        if (currentCreditsForReset) {
          const subscriptionCredits = getSubscriptionCredits(
            currentCreditsForReset.userType, 
            currentCreditsForReset.subscriptionTier
          );
          const defaultDailyCredits = subscriptionCredits.monthlyCredits;
          
          // Use the admin service to reset daily credits directly
          success = await creditServiceAdmin.resetDailyCreditsToDefault(userId);
        }
        break;
        
      case 'refresh':
        // Refresh credits for a specific user (check if they need refresh)
        const currentCreditsForRefresh = await creditServiceAdmin.getUserCredits(userId);
        if (currentCreditsForRefresh) {
          // Check if credits need refresh
          const lastRefresh = new Date(currentCreditsForRefresh.lastCreditRefresh);
          const now = new Date();
          
          // Check if we've crossed midnight since last refresh
          const lastRefreshDay = new Date(lastRefresh.getFullYear(), lastRefresh.getMonth(), lastRefresh.getDate());
          const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          if (currentDay > lastRefreshDay) {
            // Credits need refresh
            await creditServiceAdmin.refreshCreditsForUser(userId, currentCreditsForRefresh);
            success = true;
          } else {
            // No refresh needed - same day
            success = true; // Still return success, just no action taken
          }
        } else {
          // No credits record - initialize them
          const newCredits = await creditServiceAdmin.initializeUserCredits(
            userId,
            'couple', // Default user type
            'free'    // Default tier
          );
          success = !!newCredits;
        }
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: add, subtract, set, initialize, repair, reset_daily' },
          { status: 400 }
        );
    }
    
    if (success) {
      // Return updated credits
      const updatedCredits = await creditServiceAdmin.getUserCredits(userId);
      return NextResponse.json({
        success: true,
        credits: updatedCredits
      });
    } else {
      console.error(`Credit action failed for user ${userId}, action: ${action}`);
      return NextResponse.json(
        { error: 'Failed to perform credit action' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error performing credit action:', error);
    console.error('Error details:', {
      userId: userId || 'unknown',
      action: action || 'unknown',
      amount: amount || 'unknown',
      reason: reason || 'unknown',
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to perform credit action' },
      { status: 500 }
    );
  }
}
