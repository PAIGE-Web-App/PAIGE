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
        userType
      );
    } else if (usagePercentage > 80) {
      await sendCreditAlertEmail(
        userData.email,
        userData.userName || userData.displayName,
        'low',
        currentCredits,
        subscriptionTier,
        userType
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
      emailUserData
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

// Send missed deadline reminder emails
export async function sendMissedDeadlineReminders(): Promise<void> {
  try {
    const { adminDb } = await import('@/lib/firebaseAdmin');
    const { sendMissedDeadlineEmail } = await import('@/lib/emailService');
    
    console.log('🔍 Checking for missed deadlines...');
    
    // Get all users
    const usersSnapshot = await adminDb.collection('users').get();
    let totalSent = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        if (!userData.email) {
          console.log(`Skipping user ${userId} - no email address`);
          continue;
        }
        
        // Get all incomplete todo items for this user
        const todoItemsSnapshot = await adminDb
          .collection(`users/${userId}/todoItems`)
          .where('isCompleted', '==', false)
          .get();
        
        if (todoItemsSnapshot.empty) {
          continue;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Find overdue todos (filter to only those not already notified for this due date)
        const overdueTodos: Array<any> = [];
        const overdueTodoRefs: Array<{ ref: FirebaseFirestore.DocumentReference; deadlineIso: string }> = [];
        
        for (const todoDoc of todoItemsSnapshot.docs) {
          const todoData = todoDoc.data();
          
          if (todoData.deadline) {
            const deadlineDate = todoData.deadline.toDate ? todoData.deadline.toDate() : new Date(todoData.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            
            if (deadlineDate < today) {
              const daysOverdue = Math.floor((today.getTime() - deadlineDate.getTime()) / (1000 * 3600 * 24));
              const notifications = (todoData as any).notifications || {};
              const deadlineIso = deadlineDate.toISOString().slice(0, 10);
              // Skip if we've already sent for this specific deadline snapshot
              if (notifications?.missedDeadlineSnapshot === deadlineIso) {
                continue;
              }
              
              // Get todo list name
              let listName = '';
              if (todoData.listId) {
                const listDoc = await adminDb.collection(`users/${userId}/todoLists`).doc(todoData.listId).get();
                if (listDoc.exists) {
                  listName = listDoc.data()?.name || '';
                }
              }
              
              overdueTodos.push({
                id: todoDoc.id,
                name: todoData.name,
                deadline: deadlineDate,
                category: todoData.category,
                listName: listName,
                daysOverdue: daysOverdue
              });
              overdueTodoRefs.push({ ref: todoDoc.ref, deadlineIso });
            }
          }
        }
        
        // Only send if there are overdue todos
        if (overdueTodos.length > 0) {
          await sendMissedDeadlineEmail(
            userData.email,
            userData.userName || userData.displayName,
            overdueTodos,
            userId
          );
          
          totalSent++;
          console.log(`✅ Missed deadline reminder sent to: ${userData.email} (${overdueTodos.length} overdue tasks)`);

          // Mark todos as notified for this snapshot
          const batch = adminDb.batch();
          overdueTodoRefs.forEach(({ ref, deadlineIso }) => {
            batch.set(ref, {
              notifications: {
                missedDeadlineSentAt: new Date().toISOString(),
                missedDeadlineSnapshot: deadlineIso
              }
            }, { merge: true });
          });
          await batch.commit();
        }
        
      } catch (error) {
        console.error(`❌ Failed to check missed deadlines for user ${userDoc.id}:`, error);
      }
    }
    
    console.log(`📊 Missed deadline check completed: ${totalSent} emails sent`);
    
  } catch (error) {
    console.error('Error checking missed deadlines:', error);
  }
}

// Send budget payment overdue reminder emails
export async function sendBudgetPaymentOverdueReminders(): Promise<void> {
  try {
    const { adminDb } = await import('@/lib/firebaseAdmin');
    const { sendBudgetPaymentOverdueEmail } = await import('@/lib/emailService');
    
    console.log('🔍 Checking for overdue budget payments...');
    
    // Get all users
    const usersSnapshot = await adminDb.collection('users').get();
    let totalSent = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        if (!userData.email) {
          console.log(`Skipping user ${userId} - no email address`);
          continue;
        }
        
        // Get all budget items for this user
        const budgetItemsSnapshot = await adminDb
          .collection(`users/${userId}/budgetItems`)
          .get();
        
        if (budgetItemsSnapshot.empty) {
          continue;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Find overdue budget items (only those not already notified for this due date)
        const overdueItems: Array<any> = [];
        const overdueItemRefs: Array<{ ref: FirebaseFirestore.DocumentReference; dueIso: string }> = [];
        
        for (const itemDoc of budgetItemsSnapshot.docs) {
          const itemData = itemDoc.data();
          
          // Only check items that are not paid and have a due date
          if (!itemData.isPaid && itemData.dueDate) {
            const dueDate = itemData.dueDate.toDate ? itemData.dueDate.toDate() : new Date(itemData.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate < today) {
              const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
              const notifications = (itemData as any).notifications || {};
              const dueIso = dueDate.toISOString().slice(0, 10);
              if (notifications?.overduePaymentSnapshot === dueIso) {
                continue;
              }
              
              overdueItems.push({
                id: itemDoc.id,
                name: itemData.name,
                amount: itemData.amount || 0,
                dueDate: dueDate,
                category: itemData.categoryId, // You might want to get the actual category name
                daysOverdue: daysOverdue
              });
              overdueItemRefs.push({ ref: itemDoc.ref, dueIso });
            }
          }
        }
        
        // Only send if there are overdue items
        if (overdueItems.length > 0) {
          await sendBudgetPaymentOverdueEmail(
            userData.email,
            userData.userName || userData.displayName,
            overdueItems,
            userId
          );
          
          totalSent++;
          console.log(`✅ Budget payment overdue reminder sent to: ${userData.email} (${overdueItems.length} overdue items)`);

          // Mark items as notified for this due date snapshot
          const batch = adminDb.batch();
          overdueItemRefs.forEach(({ ref, dueIso }) => {
            batch.set(ref, {
              notifications: {
                overduePaymentSentAt: new Date().toISOString(),
                overduePaymentSnapshot: dueIso
              }
            }, { merge: true });
          });
          await batch.commit();
        }
        
      } catch (error) {
        console.error(`❌ Failed to check overdue budget payments for user ${userDoc.id}:`, error);
      }
    }
    
    console.log(`📊 Budget payment overdue check completed: ${totalSent} emails sent`);
    
  } catch (error) {
    console.error('Error checking overdue budget payments:', error);
  }
}

// Send budget creation reminder emails (1 week after signup)
export async function sendBudgetCreationReminders(): Promise<void> {
  try {
    const { adminDb } = await import('@/lib/firebaseAdmin');
    const { sendBudgetCreationReminderEmail } = await import('@/lib/emailService');
    
    console.log('🔍 Checking for users who need budget creation reminders...');
    
    // Get users who signed up exactly 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);
    
    const oneWeekAgoEnd = new Date(oneWeekAgo);
    oneWeekAgoEnd.setHours(23, 59, 59, 999);
    
    const usersSnapshot = await adminDb
      .collection('users')
      .where('createdAt', '>=', oneWeekAgo)
      .where('createdAt', '<=', oneWeekAgoEnd)
      .get();
    
    let totalSent = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        if (!userData.email) {
          console.log(`Skipping user ${userId} - no email address`);
          continue;
        }
        
        // Check if user has any budget items
        const budgetItemsSnapshot = await adminDb
          .collection(`users/${userId}/budgetItems`)
          .limit(1)
          .get();
        
        // Only send reminder if user has no budget items
        if (budgetItemsSnapshot.empty) {
          await sendBudgetCreationReminderEmail(
            userData.email,
            userData.userName || userData.displayName,
            userId
          );
          
          totalSent++;
          console.log(`✅ Budget creation reminder sent to: ${userData.email}`);
        } else {
          console.log(`Skipping user ${userData.email} - already has budget items`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to check budget creation reminder for user ${userDoc.id}:`, error);
      }
    }
    
    console.log(`📊 Budget creation reminder check completed: ${totalSent} emails sent`);
    
  } catch (error) {
    console.error('Error checking budget creation reminders:', error);
  }
}
