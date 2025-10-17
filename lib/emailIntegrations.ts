import { sendCreditAlertEmail } from './emailService';
import { sendWelcomeEmail } from './emailService';
import { sendTaskAssignmentEmail } from './emailTemplates';
import { sendVendorCommunicationEmail } from './vendorEmails';
import { sendMilestoneEmail } from './emailTemplates';
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

// Task Assignment Integration
export const sendTaskNotification = async (
  taskId: string,
  action: 'assigned' | 'completed' | 'updated' | 'overdue',
  assignedToUserId?: string,
  assignedByUserId?: string
) => {
  try {
    const db = getAdminDb();
    
    // Get task data
    const taskDoc = await db.collection('todos').doc(taskId).get();
    if (!taskDoc.exists) return;
    
    const taskData = taskDoc.data();
    
    // Get assigned to user data
    let assignedToUser = null;
    if (assignedToUserId) {
      const assignedToDoc = await db.collection('users').doc(assignedToUserId).get();
      assignedToUser = assignedToDoc.exists ? assignedToDoc.data() : null;
    }
    
    // Get assigned by user data
    let assignedByUser = null;
    if (assignedByUserId) {
      const assignedByDoc = await db.collection('users').doc(assignedByUserId).get();
      assignedByUser = assignedByDoc.exists ? assignedByDoc.data() : null;
    }
    
    if (assignedToUser) {
      await sendTaskAssignmentEmail(
        assignedToUser.email,
        assignedToUser.userName || assignedToUser.displayName,
        taskData.title,
        action,
        assignedByUser?.userName || assignedByUser?.displayName,
        taskData.dueDate ? new Date(taskData.dueDate).toLocaleDateString() : undefined,
        assignedToUserId
      );
    }
  } catch (error) {
    console.error('❌ Error sending task notification:', error);
  }
};

// Vendor Communication Integration
export const sendVendorNotification = async (
  messageId: string,
  messageType: 'new-message' | 'quote-received' | 'booking-confirmed' | 'payment-reminder',
  userId: string,
  vendorId?: string
) => {
  try {
    const db = getAdminDb();
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    
    // Get message data
    const messageDoc = await db.collection('messages').doc(messageId).get();
    if (!messageDoc.exists) return;
    
    const messageData = messageDoc.data();
    
    // Get vendor data if vendorId provided
    let vendorName = 'Vendor';
    if (vendorId) {
      const vendorDoc = await db.collection('vendors').doc(vendorId).get();
      if (vendorDoc.exists) {
        const vendorData = vendorDoc.data();
        vendorName = vendorData.name || 'Vendor';
      }
    }
    
    await sendVendorCommunicationEmail(
      userData.email,
      userData.userName || userData.displayName,
      vendorName,
      messageType,
      messageData.content,
      messageData.quoteAmount,
      messageData.dueDate ? new Date(messageData.dueDate).toLocaleDateString() : undefined,
      userId
    );
  } catch (error) {
    console.error('❌ Error sending vendor notification:', error);
  }
};

// Milestone Email Integration
export const checkAndSendMilestoneEmails = async (userId: string) => {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const weddingDate = userData.weddingDate;
    
    if (!weddingDate) return;
    
    const weddingDateObj = new Date(weddingDate);
    const today = new Date();
    const timeDiff = weddingDateObj.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    let milestone: '12-months' | '6-months' | '3-months' | '1-month' | '1-week' | null = null;
    
    // Check for milestone triggers
    if (daysDiff <= 7 && daysDiff > 0) {
      milestone = '1-week';
    } else if (daysDiff <= 30 && daysDiff > 7) {
      milestone = '1-month';
    } else if (daysDiff <= 90 && daysDiff > 30) {
      milestone = '3-months';
    } else if (daysDiff <= 180 && daysDiff > 90) {
      milestone = '6-months';
    } else if (daysDiff <= 365 && daysDiff > 180) {
      milestone = '12-months';
    }
    
    if (milestone) {
      await sendMilestoneEmail(
        userData.email,
        userData.userName || userData.displayName,
        milestone,
        weddingDateObj.toLocaleDateString(),
        userId
      );
    }
  } catch (error) {
    console.error('❌ Error checking milestone emails:', error);
  }
};
