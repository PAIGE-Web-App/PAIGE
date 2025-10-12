/**
 * Gmail Quota Service
 * Manages daily email sending and import quotas for users
 * Uses existing Firestore user document to avoid new collections/indexes
 */

import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export interface GmailQuotas {
  emailsSentToday: number;
  emailsSentResetAt: Date;
  messagesImportedToday: number;
  messagesImportedResetAt: Date;
}

export interface QuotaConfig {
  dailyEmailLimit: number;
  dailyImportLimit: number;
}

export class GmailQuotaService {
  private static readonly DEFAULT_CONFIG: QuotaConfig = {
    dailyEmailLimit: 50,      // Conservative limit for free Gmail
    dailyImportLimit: 100,    // Prevent excessive API calls
  };

  /**
   * Check if user can send an email (within daily quota)
   */
  static async canSendEmail(userId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date | null; reason?: string }> {
    try {
      const quotas = await this.getQuotas(userId);
      const limit = this.DEFAULT_CONFIG.dailyEmailLimit;

      // Check if quota needs reset (new day)
      if (this.shouldResetQuota(quotas.emailsSentResetAt)) {
        await this.resetEmailQuota(userId);
        return {
          allowed: true,
          remaining: limit - 1,
          resetAt: this.getNextResetTime()
        };
      }

      // Check if within limit
      if (quotas.emailsSentToday >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: quotas.emailsSentResetAt,
          reason: `Daily email limit reached (${limit} emails/day). Limit resets at ${quotas.emailsSentResetAt.toLocaleTimeString()}.`
        };
      }

      return {
        allowed: true,
        remaining: limit - quotas.emailsSentToday,
        resetAt: quotas.emailsSentResetAt
      };
    } catch (error) {
      console.error('Error checking email quota:', error);
      // Fail open - allow the action if quota check fails
      return {
        allowed: true,
        remaining: this.DEFAULT_CONFIG.dailyEmailLimit,
        resetAt: null,
        reason: 'Quota check failed, allowing action'
      };
    }
  }

  /**
   * Check if user can import messages (within daily quota)
   */
  static async canImportMessages(userId: string, count: number = 1): Promise<{ allowed: boolean; remaining: number; resetAt: Date | null; reason?: string }> {
    try {
      const quotas = await this.getQuotas(userId);
      const limit = this.DEFAULT_CONFIG.dailyImportLimit;

      // Check if quota needs reset (new day)
      if (this.shouldResetQuota(quotas.messagesImportedResetAt)) {
        await this.resetImportQuota(userId);
        return {
          allowed: count <= limit,
          remaining: limit - count,
          resetAt: this.getNextResetTime()
        };
      }

      // Check if within limit
      const newTotal = quotas.messagesImportedToday + count;
      if (newTotal > limit) {
        return {
          allowed: false,
          remaining: Math.max(0, limit - quotas.messagesImportedToday),
          resetAt: quotas.messagesImportedResetAt,
          reason: `Daily import limit would be exceeded. ${Math.max(0, limit - quotas.messagesImportedToday)} messages remaining. Limit resets at ${quotas.messagesImportedResetAt.toLocaleTimeString()}.`
        };
      }

      return {
        allowed: true,
        remaining: limit - newTotal,
        resetAt: quotas.messagesImportedResetAt
      };
    } catch (error) {
      console.error('Error checking import quota:', error);
      // Fail open - allow the action if quota check fails
      return {
        allowed: true,
        remaining: this.DEFAULT_CONFIG.dailyImportLimit,
        resetAt: null,
        reason: 'Quota check failed, allowing action'
      };
    }
  }

  /**
   * Increment email sent counter
   */
  static async incrementEmailSent(userId: string): Promise<void> {
    try {
      const userRef = adminDb.collection('users').doc(userId);
      
      await adminDb.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const quotas = this.parseQuotas(userData?.gmailQuotas);

        // Reset if needed
        if (this.shouldResetQuota(quotas.emailsSentResetAt)) {
          transaction.update(userRef, {
            'gmailQuotas.emailsSentToday': 1,
            'gmailQuotas.emailsSentResetAt': Timestamp.fromDate(this.getNextResetTime())
          });
        } else {
          transaction.update(userRef, {
            'gmailQuotas.emailsSentToday': quotas.emailsSentToday + 1
          });
        }
      });

      console.log(`✅ Incremented email count for user ${userId}`);
    } catch (error) {
      console.error('Error incrementing email count:', error);
      // Don't throw - this is a tracking mechanism, not critical
    }
  }

  /**
   * Increment messages imported counter
   */
  static async incrementMessagesImported(userId: string, count: number = 1): Promise<void> {
    try {
      const userRef = adminDb.collection('users').doc(userId);
      
      await adminDb.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const quotas = this.parseQuotas(userData?.gmailQuotas);

        // Reset if needed
        if (this.shouldResetQuota(quotas.messagesImportedResetAt)) {
          transaction.update(userRef, {
            'gmailQuotas.messagesImportedToday': count,
            'gmailQuotas.messagesImportedResetAt': Timestamp.fromDate(this.getNextResetTime())
          });
        } else {
          transaction.update(userRef, {
            'gmailQuotas.messagesImportedToday': quotas.messagesImportedToday + count
          });
        }
      });

      console.log(`✅ Incremented import count for user ${userId} by ${count}`);
    } catch (error) {
      console.error('Error incrementing import count:', error);
      // Don't throw - this is a tracking mechanism, not critical
    }
  }

  /**
   * Get current quotas for a user
   */
  private static async getQuotas(userId: string): Promise<GmailQuotas> {
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    return this.parseQuotas(userData?.gmailQuotas);
  }

  /**
   * Parse quotas from Firestore data (with defaults)
   */
  private static parseQuotas(quotaData: any): GmailQuotas {
    const now = new Date();
    const tomorrow = this.getNextResetTime();

    return {
      emailsSentToday: quotaData?.emailsSentToday || 0,
      emailsSentResetAt: quotaData?.emailsSentResetAt?.toDate() || tomorrow,
      messagesImportedToday: quotaData?.messagesImportedToday || 0,
      messagesImportedResetAt: quotaData?.messagesImportedResetAt?.toDate() || tomorrow,
    };
  }

  /**
   * Check if quota should be reset (new day)
   */
  private static shouldResetQuota(resetAt: Date): boolean {
    return new Date() >= resetAt;
  }

  /**
   * Get next reset time (midnight tonight)
   */
  private static getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0); // Midnight tonight
    return tomorrow;
  }

  /**
   * Reset email quota for a user
   */
  private static async resetEmailQuota(userId: string): Promise<void> {
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      'gmailQuotas.emailsSentToday': 0,
      'gmailQuotas.emailsSentResetAt': Timestamp.fromDate(this.getNextResetTime())
    });
  }

  /**
   * Reset import quota for a user
   */
  private static async resetImportQuota(userId: string): Promise<void> {
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      'gmailQuotas.messagesImportedToday': 0,
      'gmailQuotas.messagesImportedResetAt': Timestamp.fromDate(this.getNextResetTime())
    });
  }

  /**
   * Reset all quotas for a user (called by daily cron)
   */
  static async resetAllQuotas(userId: string): Promise<void> {
    try {
      const userRef = adminDb.collection('users').doc(userId);
      const nextReset = this.getNextResetTime();
      
      await userRef.update({
        'gmailQuotas.emailsSentToday': 0,
        'gmailQuotas.emailsSentResetAt': Timestamp.fromDate(nextReset),
        'gmailQuotas.messagesImportedToday': 0,
        'gmailQuotas.messagesImportedResetAt': Timestamp.fromDate(nextReset)
      });

      console.log(`✅ Reset all quotas for user ${userId}`);
    } catch (error) {
      console.error(`Error resetting quotas for user ${userId}:`, error);
      // Don't throw - this is a background task
    }
  }

  /**
   * Get quota config (for display purposes)
   */
  static getQuotaConfig(): QuotaConfig {
    return { ...this.DEFAULT_CONFIG };
  }
}

