import { getAdminDb, adminDb } from './firebaseAdmin';
import { 
  UserCredits,
  CreditTransaction,
  CreditTransactionType,
  AIFeature,
  UserType,
  SubscriptionTier,
  CreditValidationResult,
  getCreditCosts,
  getSubscriptionCredits
} from '@/types/credits';

const db = getAdminDb();

export class CreditServiceAdmin {
  private static instance: CreditServiceAdmin;

  static getInstance(): CreditServiceAdmin {
    if (!CreditServiceAdmin.instance) {
      CreditServiceAdmin.instance = new CreditServiceAdmin();
    }
    return CreditServiceAdmin.instance;
  }

  /**
   * Initialize or get user credits
   */
  async initializeUserCredits(
    userId: string, 
    userType: UserType = 'couple', 
    subscriptionTier: SubscriptionTier = 'free'
  ): Promise<UserCredits> {
    try {
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();

      if (userSnap.exists) {
        const userData = userSnap.data();
        
        // Check if user already has credits
        if (userData?.credits) {
          const existingCredits = userData.credits as UserCredits;
          
                  // Check if credits need refresh
        const needsRefresh = this.shouldRefreshCredits(existingCredits);
        
        if (needsRefresh) {
          return await this.refreshCredits(userId, existingCredits);
        }
          
          return existingCredits;
        }
      }

      // Create new user credits
      const subscriptionCredits = getSubscriptionCredits(userType, subscriptionTier);
      const newUserCredits: UserCredits = {
        userId,
        userType,
        subscriptionTier,
        dailyCredits: subscriptionCredits.monthlyCredits,
        bonusCredits: 0,
        totalCreditsUsed: 0,
        lastCreditRefresh: new Date(),
        creditHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update the user document with credits field
      await userRef.update({
        credits: newUserCredits
      });
      
      return newUserCredits;
    } catch (error) {
      console.error('Error initializing user credits:', error);
      throw new Error('Failed to initialize user credits');
    }
  }

  /**
   * Get user credits
   */
  async getUserCredits(userId: string): Promise<UserCredits | null> {
    try {
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        console.log(`[CreditServiceAdmin] User ${userId} not found`);
        return null;
      }

      const userData = userSnap.data();
      if (!userData?.credits) {
        return null;
      }

      const credits = userData.credits as UserCredits;
      
      // Ensure timestamps are Date objects - handle both Date and Firestore Timestamp
      const convertTimestamp = (timestamp: any): Date => {
        if (timestamp instanceof Date) return timestamp;
        if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
          return new Date(timestamp._seconds * 1000);
        }
        if (timestamp) return new Date(timestamp);
        return new Date();
      };
      
      const convertedCredits = {
        ...credits,
        lastCreditRefresh: convertTimestamp(credits.lastCreditRefresh),
        createdAt: convertTimestamp(credits.createdAt),
        updatedAt: convertTimestamp(credits.updatedAt),
        creditHistory: credits.creditHistory?.map(transaction => ({
          ...transaction,
          timestamp: convertTimestamp(transaction.timestamp)
        })) || []
      };

      // Check for corrupted data
      if (isNaN(convertedCredits.dailyCredits) || isNaN(convertedCredits.bonusCredits) || isNaN(convertedCredits.totalCreditsUsed)) {
        console.error(`[CreditServiceAdmin] CORRUPTED CREDITS for ${userId}:`, {
          dailyCredits: convertedCredits.dailyCredits,
          bonusCredits: convertedCredits.bonusCredits,
          totalCreditsUsed: convertedCredits.totalCreditsUsed
        });
      }
      
      return convertedCredits;
    } catch (error) {
      console.error('Error getting user credits:', error);
      return null;
    }
  }

  /**
   * Add credits (for purchases, bonuses, etc.)
   */
  async addCredits(
    userId: string, 
    amount: number, 
    type: CreditTransactionType = 'purchased',
    description?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const userCredits = await this.getUserCredits(userId);
      if (!userCredits) {
        return false;
      }

      const transaction: CreditTransaction = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        amount,
        feature: 'bonus' as AIFeature, // Special case for adding credits
        timestamp: new Date(),
        metadata,
        description: description || `Added ${amount} credits`
      };

      // Use admin SDK transaction
      console.log(`[CreditServiceAdmin] Starting transaction for user ${userId}, amount: ${amount}`);
      console.log(`[CreditServiceAdmin] Current credits before update:`, userCredits);
      
      await db.runTransaction(async (firestoreTransaction) => {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await firestoreTransaction.get(userRef);
        
        if (!userSnap.exists) {
          throw new Error('User not found');
        }

        const userData = userSnap.data();
        if (!userData?.credits) {
          throw new Error('User credits not found');
        }

        const currentCredits = userData.credits as UserCredits;
        console.log(`[CreditServiceAdmin] Credits from transaction:`, currentCredits);
        
        // Update credits and add transaction to history array
        const updatedCreditHistory = [...(currentCredits.creditHistory || []), {
          ...transaction,
          timestamp: new Date() // Ensure timestamp is a Date object
        }];
        
        // Update the entire credits object to ensure proper Firestore update
        const updatedCredits = {
          ...currentCredits,
          // Only update the appropriate credit type based on transaction type
          ...(type === 'bonus' ? { bonusCredits: currentCredits.bonusCredits + amount } : {}),
          ...(type === 'purchased' ? { bonusCredits: currentCredits.bonusCredits + amount } : {}),
          totalCreditsUsed: currentCredits.totalCreditsUsed + Math.max(0, -amount), // Only count spent credits
          creditHistory: updatedCreditHistory,
          updatedAt: new Date()
        };
        
        console.log(`[CreditServiceAdmin] Updated credits:`, updatedCredits);
        console.log(`[CreditServiceAdmin] Updating Firestore with:`, { credits: updatedCredits });
        
        firestoreTransaction.update(userRef, {
          credits: updatedCredits
        });
        
        console.log(`[CreditServiceAdmin] Firestore update completed in transaction`);
      });
      
      console.log(`[CreditServiceAdmin] Transaction completed successfully`);
      
      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  /**
   * Check if credits should be refreshed (daily, monthly, or yearly)
   */
  private shouldRefreshCredits(userCredits: UserCredits): boolean {
    const now = new Date();
    const lastRefresh = userCredits.lastCreditRefresh;
    
    // Get the refresh frequency from subscription config
    const subscriptionCredits = getSubscriptionCredits(
      userCredits.userType, 
      userCredits.subscriptionTier
    );
    
    switch (subscriptionCredits.creditRefresh) {
      case 'daily':
        return this.shouldRefreshDaily(lastRefresh);
      case 'monthly':
        return this.shouldRefreshMonthly(lastRefresh);
      case 'yearly':
        return this.shouldRefreshYearly(lastRefresh);
      default:
        return this.shouldRefreshDaily(lastRefresh); // Default to daily
    }
  }

  /**
   * Check if credits should be refreshed daily (at midnight in user's timezone)
   */
  private shouldRefreshDaily(lastRefresh: Date): boolean {
    const now = new Date();
    const lastRefreshDate = new Date(lastRefresh);
    
    // Check if we've crossed midnight since last refresh
    const lastRefreshDay = new Date(lastRefreshDate.getFullYear(), lastRefreshDate.getMonth(), lastRefreshDate.getDate());
    const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Refresh if it's a new day (crossed midnight)
    return currentDay > lastRefreshDay;
  }

  /**
   * Check if credits should be refreshed monthly
   */
  private shouldRefreshMonthly(lastRefresh: Date): boolean {
    const now = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    return lastRefresh < monthAgo;
  }

  /**
   * Check if credits should be refreshed yearly
   */
  private shouldRefreshYearly(lastRefresh: Date): boolean {
    const now = new Date();
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    
    return lastRefresh < yearAgo;
  }

  /**
   * Reset daily credits to tier default (admin only)
   */
  async resetDailyCreditsToDefault(userId: string): Promise<boolean> {
    try {
      const userCredits = await this.getUserCredits(userId);
      if (!userCredits) {
        return false;
      }

      const subscriptionCredits = getSubscriptionCredits(
        userCredits.userType, 
        userCredits.subscriptionTier
      );
      const defaultDailyCredits = subscriptionCredits.monthlyCredits;

      // Create a transaction record for the reset
      const transaction: CreditTransaction = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'bonus', // Use bonus type for admin actions
        amount: defaultDailyCredits - userCredits.dailyCredits,
        feature: 'bonus' as AIFeature,
        timestamp: new Date(),
        metadata: { adminAction: true, action: 'reset_daily_credits' },
        description: `Admin reset daily credits to tier default (${defaultDailyCredits})`
      };

      await db.runTransaction(async (firestoreTransaction) => {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await firestoreTransaction.get(userRef);
        
        if (!userSnap.exists) {
          throw new Error('User not found');
        }

        const userData = userSnap.data();
        if (!userData?.credits) {
          throw new Error('User credits not found');
        }

        const currentCredits = userData.credits as UserCredits;
        
        // Update credits and add transaction to history array
        const updatedCreditHistory = [...(currentCredits.creditHistory || []), {
          ...transaction,
          timestamp: new Date()
        }];
        
        // Update the entire credits object
        const updatedCredits = {
          ...currentCredits,
          dailyCredits: defaultDailyCredits,
          creditHistory: updatedCreditHistory,
          updatedAt: new Date()
        };
        
        firestoreTransaction.update(userRef, {
          credits: updatedCredits
        });
      });

      return true;
    } catch (error) {
      console.error('Error resetting daily credits:', error);
      return false;
    }
  }

  /**
   * Refresh credits based on subscription frequency
   */
  private async refreshCredits(
    userId: string, 
    currentCredits: UserCredits
  ): Promise<UserCredits> {
    try {
      const subscriptionCredits = getSubscriptionCredits(
        currentCredits.userType, 
        currentCredits.subscriptionTier
      );

      // No rollover - just reset to subscription limit
      const refreshedCredits: UserCredits = {
        ...currentCredits,
        dailyCredits: subscriptionCredits.monthlyCredits,
        lastCreditRefresh: new Date(),
        updatedAt: new Date()
      };

      // Update the user document
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        credits: refreshedCredits
      });

      return refreshedCredits;
    } catch (error) {
      console.error('Error refreshing credits:', error);
      throw new Error('Failed to refresh credits');
    }
  }

  /**
   * Refresh credits for a specific user (public method for scheduled tasks)
   */
  async refreshCreditsForUser(userId: string, currentCredits: UserCredits): Promise<UserCredits> {
    return this.refreshCredits(userId, currentCredits);
  }

  /**
   * Repair corrupted credits by resetting to default values
   */
  async repairCorruptedCredits(userId: string): Promise<boolean> {
    try {
      console.log(`[CreditServiceAdmin] Repairing corrupted credits for user ${userId}`);
      
      // Get subscription credits for this user
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      
      if (!userSnap.exists) {
        console.error(`[CreditServiceAdmin] User ${userId} not found for repair`);
        return false;
      }
      
      const userData = userSnap.data();
      const userType = userData?.userType || 'couple';
      const subscriptionTier = userData?.subscriptionTier || 'free';
      
      // Get default credits for this user type and tier
      const subscriptionCredits = getSubscriptionCredits(userType, subscriptionTier);
      
      // Create clean credits object
      const repairedCredits: UserCredits = {
        userId,
        userType,
        subscriptionTier,
        dailyCredits: subscriptionCredits.monthlyCredits,
        bonusCredits: 0,
        totalCreditsUsed: 0,
        lastCreditRefresh: new Date(),
        creditHistory: [
          {
            id: `${Date.now()}-repair-${Math.random().toString(36).substr(2, 9)}`,
            type: 'bonus',
            amount: subscriptionCredits.monthlyCredits,
            feature: 'bonus' as AIFeature,
            timestamp: new Date(),
            metadata: { adminAction: true, repair: true, timestamp: new Date().toISOString() },
            description: 'Credits repaired from corrupted state'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Update the user document with repaired credits
      await userRef.update({
        credits: repairedCredits
      });
      
      console.log(`[CreditServiceAdmin] Successfully repaired credits for ${userId}:`, {
        userType,
        subscriptionTier,
        dailyCredits: repairedCredits.dailyCredits,
        bonusCredits: repairedCredits.bonusCredits
      });
      
      return true;
    } catch (error) {
      console.error(`[CreditServiceAdmin] Error repairing credits for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Add bonus credits to user (for purchases or upgrades)
   */
  async addBonusCredits(
    userId: string, 
    credits: number, 
    source: 'purchase' | 'upgrade' | 'admin'
  ): Promise<boolean> {
    try {
      const userRef = adminDb.collection('users').doc(userId);
      const userSnap = await userRef.get();
      
      if (!userSnap.exists) {
        console.error(`User ${userId} not found`);
        return false;
      }

      const userData = userSnap.data();
      if (!userData?.credits) {
        console.error(`User ${userId} has no credits data`);
        return false;
      }

      const currentCredits = userData.credits as UserCredits;
      
      // Create transaction record
      const transaction: CreditTransaction = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'added',
        amount: credits,
        feature: source === 'purchase' ? 'credit_purchase' : 
                source === 'upgrade' ? 'subscription_upgrade' : 'admin_grant',
        timestamp: new Date(),
        description: `${source === 'purchase' ? 'Credit pack purchase' : 
                     source === 'upgrade' ? 'Subscription upgrade bonus' : 
                     'Admin credit grant'}: +${credits} credits`
      };

      // Update user credits
      await adminDb.runTransaction(async (firestoreTransaction) => {
        const updatedCreditHistory = [...(currentCredits.creditHistory || []), transaction];
        
        firestoreTransaction.update(userRef, {
          'credits.bonusCredits': currentCredits.bonusCredits + credits,
          'credits.creditHistory': updatedCreditHistory,
          'credits.updatedAt': new Date()
        });
      });

      console.log(`Added ${credits} bonus credits to user ${userId} from ${source}`);
      return true;
    } catch (error) {
      console.error(`Error adding bonus credits to user ${userId}:`, error);
      return false;
    }
  }
}

export const creditServiceAdmin = CreditServiceAdmin.getInstance();
