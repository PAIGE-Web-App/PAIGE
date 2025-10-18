import { sendCreditAlertEmail, sendWelcomeEmail, sendWeeklyTodoDigestEmail } from './emailService';
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

// Weekly Todo Digest Integration - Sent every Sunday with upcoming tasks
export const sendWeeklyTodoDigest = async (userId: string) => {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    
    // Get ALL user's todo items (completed and incomplete)
    // Note: We'll filter client-side to handle both isCompleted: false and undefined
    const todoItemsSnapshot = await db
      .collection(`users/${userId}/todoItems`)
      .get();
    
    if (todoItemsSnapshot.empty) {
      console.log(`No todos found for user ${userId}, skipping weekly digest`);
      return;
    }
    
    // Filter for incomplete items and get todo list names
    const todosWithDetails = await Promise.all(
      todoItemsSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          // Include items where isCompleted is false OR undefined (not completed)
          return data.isCompleted !== true;
        })
        .map(async (doc) => {
          const todoData = doc.data();
          let listName = '';
          
          if (todoData.listId) {
            const listDoc = await db.collection(`users/${userId}/todoLists`).doc(todoData.listId).get();
            if (listDoc.exists) {
              listName = listDoc.data()?.name || '';
            }
          }
          
          return {
            id: doc.id,
            name: todoData.name,
            deadline: todoData.deadline?.toDate ? todoData.deadline.toDate() : todoData.deadline,
            category: todoData.category,
            listName: listName
          };
        })
    );
    
    if (todosWithDetails.length === 0) {
      console.log(`No incomplete todos for user ${userId}, skipping weekly digest`);
      return;
    }
    
    console.log(`Found ${todosWithDetails.length} incomplete todos for user ${userId}`);
    
    // Sort by deadline client-side (items with deadlines first, then by date)
    const todos = todosWithDetails
      .sort((a, b) => {
        // Items without deadlines go to the end
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        
        // Sort by deadline
        const dateA = new Date(a.deadline).getTime();
        const dateB = new Date(b.deadline).getTime();
        return dateA - dateB;
      })
      .slice(0, 5); // Take only the first 5
    
    await sendWeeklyTodoDigestEmail(
      userData.email,
      userData.userName || userData.displayName,
      todos,
      userId
    );
    
    console.log(`✅ Weekly todo digest sent successfully to: ${userData.email}`);
  } catch (error) {
    console.error(`❌ Error sending weekly todo digest:`, error);
  }
};
