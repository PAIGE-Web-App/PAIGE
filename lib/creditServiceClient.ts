import { 
  UserCredits,
  CreditTransaction,
  AIFeature,
  CreditValidationResult
} from '@/types/credits';

export class CreditServiceClient {
  private static instance: CreditServiceClient;

  static getInstance(): CreditServiceClient {
    if (!CreditServiceClient.instance) {
      CreditServiceClient.instance = new CreditServiceClient();
    }
    return CreditServiceClient.instance;
  }

  /**
   * Get user credits via API
   */
  async getUserCredits(userId: string): Promise<UserCredits | null> {
    try {
      const response = await fetch('/api/credits/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.credits;
    } catch (error) {
      console.error('Error getting user credits:', error);
      return null;
    }
  }

  /**
   * Initialize user credits via API
   */
  async initializeUserCredits(
    userId: string, 
    userType: string = 'couple', 
    subscriptionTier: string = 'free'
  ): Promise<UserCredits> {
    try {
      const response = await fetch('/api/credits/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          userType, 
          subscriptionTier 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize credits');
      }

      const data = await response.json();
      return data.credits;
    } catch (error) {
      console.error('Error initializing user credits:', error);
      throw new Error('Failed to initialize user credits');
    }
  }

  /**
   * Validate credits via API
   */
  async validateCredits(
    userId: string, 
    feature: AIFeature
  ): Promise<CreditValidationResult> {
    try {
      const response = await fetch('/api/credits/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          feature 
        }),
      });

      if (!response.ok) {
        return {
          hasEnoughCredits: false,
          requiredCredits: 0,
          currentCredits: 0,
          remainingCredits: 0,
          canProceed: false,
          message: 'Error validating credits'
        };
      }

      const data = await response.json();
      return data.validation;
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
   * Get credit history via API
   */
  async getCreditHistory(
    userId: string, 
    limitCount: number = 50
  ): Promise<CreditTransaction[]> {
    try {
      const response = await fetch('/api/credits/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          limitCount 
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Error getting credit history:', error);
      return [];
    }
  }

  /**
   * Check feature access via API
   */
  async hasFeatureAccess(
    userId: string, 
    feature: AIFeature
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/credits/feature-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          feature 
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.hasAccess || false;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Deduct credits via API
   */
  async deductCredits(
    userId: string, 
    feature: AIFeature, 
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          feature, 
          metadata 
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  /**
   * Add credits via API
   */
  async addCredits(
    userId: string, 
    amount: number, 
    type: string = 'purchased',
    description?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/credits/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          amount, 
          type, 
          description, 
          metadata 
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }
}

// Export singleton instance
export const creditServiceClient = CreditServiceClient.getInstance();
