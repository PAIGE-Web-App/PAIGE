import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  runTransaction
} from 'firebase/firestore';
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

export class CreditService {
  private static instance: CreditService;

  static getInstance(): CreditService {
    if (!CreditService.instance) {
      CreditService.instance = new CreditService();
    }
    return CreditService.instance;
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
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // Check if user already has credits
        if (userData.credits) {
          const existingCredits = userData.credits as UserCredits;
          
          // Check if credits need refresh
          if (this.shouldRefreshCredits(existingCredits)) {
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
      await updateDoc(userRef, {
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
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      const userData = userSnap.data();
      
      if (!userData.credits) {
        return null;
      }

      const userCredits = userData.credits as UserCredits;
      
              // Check if credits need refresh
        if (this.shouldRefreshCredits(userCredits)) {
          return await this.refreshCredits(userId, userCredits);
        }

      return userCredits;
    } catch (error) {
      console.error('Error getting user credits:', error);
      return null;
    }
  }

  /**
   * Validate if user has enough credits for an AI feature
   */
  async validateCredits(
    userId: string, 
    feature: AIFeature
  ): Promise<CreditValidationResult> {
    try {
      const userCredits = await this.getUserCredits(userId);
      
      if (!userCredits) {
        // Initialize credits if they don't exist
        const newCredits = await this.initializeUserCredits(userId);
        return this.validateCreditsForUser(newCredits, feature);
      }

      return this.validateCreditsForUser(userCredits, feature);
    } catch (error) {
      console.error('Error validating credits:', error);
      return {
        hasEnoughCredits: false,
        requiredCredits: 0,
        currentCredits: 0,
        remainingCredits: 0,
        canProceed: false,
        message: 'Error validating credits'
      };
    }
  }

  /**
   * Deduct credits for AI feature usage
   */
  async deductCredits(
    userId: string, 
    feature: AIFeature, 
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const validation = await this.validateCredits(userId, feature);
      
      if (!validation.canProceed) {
        return false;
      }

      const userCredits = await this.getUserCredits(userId);
      if (!userCredits) {
        return false;
      }

      const creditCosts = getCreditCosts(userCredits.userType);
      const cost = creditCosts[feature] || 1;

      // Create transaction record
      const transaction: CreditTransaction = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'spent',
        amount: cost,
        feature,
        timestamp: new Date(),
        metadata,
        description: `Used ${feature} feature`
      };

      // Update user credits
      await runTransaction(db, async (firestoreTransaction) => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await firestoreTransaction.get(userRef);
        
        if (!userSnap.exists()) {
          throw new Error('User not found');
        }

        const userData = userSnap.data();
        if (!userData.credits) {
          throw new Error('User credits not found');
        }

        const currentCredits = userData.credits as UserCredits;
        const totalAvailable = currentCredits.dailyCredits + currentCredits.bonusCredits;
        
        if (totalAvailable < cost) {
          throw new Error('Insufficient credits');
        }

        // Deduct from daily credits first, then bonus credits
        let newDailyCredits = currentCredits.dailyCredits;
        let newBonusCredits = currentCredits.bonusCredits;
        
        if (currentCredits.dailyCredits >= cost) {
          newDailyCredits = currentCredits.dailyCredits - cost;
        } else {
          newDailyCredits = 0;
          newBonusCredits = currentCredits.bonusCredits - (cost - currentCredits.dailyCredits);
        }

        // Update credits and add transaction to history array
        const updatedCreditHistory = [...(currentCredits.creditHistory || []), {
          ...transaction,
          timestamp: new Date() // Ensure timestamp is a Date object
        }];
        
        firestoreTransaction.update(userRef, {
          'credits.dailyCredits': newDailyCredits,
          'credits.bonusCredits': newBonusCredits,
          'credits.totalCreditsUsed': currentCredits.totalCreditsUsed + cost,
          'credits.creditHistory': updatedCreditHistory,
          'credits.updatedAt': new Date()
        });
      });

      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
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

      await runTransaction(db, async (firestoreTransaction) => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await firestoreTransaction.get(userRef);
        
        if (!userSnap.exists()) {
          throw new Error('User not found');
        }

        const userData = userSnap.data();
        if (!userData.credits) {
          throw new Error('User credits not found');
        }

        const currentCredits = userData.credits as UserCredits;
        
        // Update credits and add transaction to history array
        const updatedCreditHistory = [...(currentCredits.creditHistory || []), {
          ...transaction,
          timestamp: new Date() // Ensure timestamp is a Date object
        }];
        
        firestoreTransaction.update(userRef, {
          'credits.bonusCredits': currentCredits.bonusCredits + amount,
          'credits.creditHistory': updatedCreditHistory,
          'credits.updatedAt': new Date()
        });
      });

      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  /**
   * Get credit usage history
   */
  async getCreditHistory(
    userId: string, 
    limitCount: number = 50
  ): Promise<CreditTransaction[]> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return [];
      }

      const userData = userSnap.data();
      if (!userData.credits || !userData.credits.creditHistory) {
        return [];
      }

      const creditHistory = userData.credits.creditHistory as CreditTransaction[];
      
      // Sort by timestamp descending and limit, ensuring timestamps are Date objects
      return creditHistory
        .map(transaction => ({
          ...transaction,
          timestamp: transaction.timestamp instanceof Date ? transaction.timestamp : new Date(transaction.timestamp)
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limitCount);
    } catch (error) {
      console.error('Error getting credit history:', error);
      return [];
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
   * More conservative: only refresh if it's been more than 24 hours
   */
  private shouldRefreshDaily(lastRefresh: Date): boolean {
    const now = new Date();
    const lastRefreshDate = new Date(lastRefresh);
    
    // Check if it's been more than 24 hours since last refresh
    const timeDiff = now.getTime() - lastRefreshDate.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Only refresh if it's been more than 24 hours
    return hoursDiff >= 24;
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
      const newCredits = subscriptionCredits.monthlyCredits;

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'credits.dailyCredits': newCredits,
        'credits.lastCreditRefresh': new Date(),
        'credits.updatedAt': new Date()
      });

      return {
        ...currentCredits,
        dailyCredits: newCredits,
        lastCreditRefresh: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error refreshing credits:', error);
      return currentCredits;
    }
  }

  /**
   * Validate credits for a specific user
   */
  private validateCreditsForUser(
    userCredits: UserCredits, 
    feature: AIFeature
  ): CreditValidationResult {
    const creditCosts = getCreditCosts(userCredits.userType);
    const cost = creditCosts[feature] || 1;
    
    const totalAvailable = userCredits.dailyCredits + userCredits.bonusCredits;
    const hasEnoughCredits = totalAvailable >= cost;
    const remainingCredits = Math.max(0, totalAvailable - cost);

    return {
      hasEnoughCredits,
      requiredCredits: cost,
      currentCredits: totalAvailable,
      remainingCredits,
      canProceed: hasEnoughCredits,
      message: hasEnoughCredits 
        ? `Credits available: ${totalAvailable}` 
        : `Insufficient credits. Need ${cost}, have ${totalAvailable}`
    };
  }

  /**
   * Check if user has access to a specific AI feature
   */
  async hasFeatureAccess(
    userId: string, 
    feature: AIFeature
  ): Promise<boolean> {
    try {
      const userCredits = await this.getUserCredits(userId);
      if (!userCredits) {
        return false;
      }

      const subscriptionCredits = getSubscriptionCredits(
        userCredits.userType, 
        userCredits.subscriptionTier
      );

      return subscriptionCredits.aiFeatures.includes(feature);
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }
}

// Export singleton instance
export const creditService = CreditService.getInstance();
