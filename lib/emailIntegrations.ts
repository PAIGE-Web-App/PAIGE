import { sendCreditAlertEmail, sendWelcomeEmail } from './emailService';
import { getAdminDb } from './firebaseAdmin';

// Credit Alert Integration
export const checkAndSendCreditAlerts = async (userId: string) => {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const credits = userData?.credits;
    
    if (!credits) return;
    
    const { dailyCredits = 0, bonusCredits = 0, subscriptionTier, userType } = credits;
    const currentCredits = dailyCredits + bonusCredits;
    
    // Calculate daily allocation (credits refresh daily, not monthly)
    const dailyAllocation = userType === 'couple' 
      ? subscriptionTier === 'free' ? 15 
      : subscriptionTier === 'premium' ? 22 
      : 45
      : subscriptionTier === 'free' ? 25
      : subscriptionTier === 'starter' ? 100
      : subscriptionTier === 'professional' ? 300
      : 1000;
    
    const usagePercentage = ((dailyAllocation - currentCredits) / dailyAllocation) * 100;
    
    // Send alerts based on usage
    if (currentCredits <= 0) {
      await sendCreditAlertEmail(
        userData.email,
        userData.userName || userData.displayName,
        'depleted',
        currentCredits,
        subscriptionTier,
        userType,
        userId
      );
    } else if (usagePercentage > 80) {
      await sendCreditAlertEmail(
        userData.email,
        userData.userName || userData.displayName,
        'low',
        currentCredits,
        subscriptionTier,
        userType,
        userId
      );
    }
  } catch (error) {
    console.error('❌ Error checking credit alerts:', error);
  }
};

// Welcome Email Integration - Fetch comprehensive user data for dynamic content
export const sendWelcomeEmailOnSignup = async (userId: string) => {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    
    // Convert Firestore Timestamp to Date if needed
    let weddingDate = null;
    if (userData.weddingDate) {
      if (userData.weddingDate.toDate) {
        // Firestore Timestamp
        weddingDate = userData.weddingDate.toDate();
      } else if (userData.weddingDate instanceof Date) {
        // Already a Date
        weddingDate = userData.weddingDate;
      } else if (typeof userData.weddingDate === 'string') {
        // String date
        weddingDate = new Date(userData.weddingDate);
      }
    }
    
    // Prepare user data for email template
    const emailUserData = {
      weddingDate: weddingDate,
      weddingDateUndecided: userData.weddingDateUndecided || false,
      weddingLocation: userData.weddingLocation || null,
      weddingLocationUndecided: userData.weddingLocationUndecided || false,
      hasVenue: userData.hasVenue || false,
      partnerName: userData.partnerName || null,
      guestCount: userData.guestCount || null,
      maxBudget: userData.maxBudget || null,
    };
    
    await sendWelcomeEmail(
      userData.email,
      userData.userName || userData.displayName,
      emailUserData,
      userId
    );
    
    console.log('✅ Welcome email sent successfully to:', userData.email);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
};

// Note: Message notifications are handled directly via /api/notifications/send
// which calls sendNotificationEmail() from emailService.ts when vendors send in-app messages
