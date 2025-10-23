import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, writeBatch, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface NotificationCounts {
  messages: number;
  todo: number;
  todoAssigned: number; // New todos assigned by others (notifications)
  budget: number;
  vendors: number;
  total: number;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({
    messages: 0,
    todo: 0,
    todoAssigned: 0,
    budget: 0,
    vendors: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [contactUnreadCounts, setContactUnreadCounts] = useState<Record<string, number>>({});

  // Function to mark notifications as read
  const markNotificationAsRead = async (type: keyof NotificationCounts) => {
    if (!user) return;

    try {
      switch (type) {
        case 'todoAssigned':
          // Mark assigned todos as read
          const todoItemsRef = collection(db, `users/${user.uid}/todoItems`);
          const todoQuery = query(
            todoItemsRef,
            where('assignedTo', 'array-contains', user.uid),
            where('assignedBy', '!=', user.uid),
            where('notificationRead', '==', false)
          );
          const todoSnapshot = await getDocs(todoQuery);
          const batch = writeBatch(db);
          todoSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { notificationRead: true });
          });
          await batch.commit();
          break;

        case 'messages':
          // Mark messages as read
          const contactsRef = collection(db, `users/${user.uid}/contacts`);
          const contactsSnapshot = await getDocs(contactsRef);
          const messageBatch = writeBatch(db);
          
          for (const contactDoc of contactsSnapshot.docs) {
            const messagesRef = collection(db, `users/${user.uid}/contacts/${contactDoc.id}/messages`);
            const messageQuery = query(
              messagesRef,
              where('isRead', '==', false),
              where('direction', '==', 'received')
            );
            const messageSnapshot = await getDocs(messageQuery);
            messageSnapshot.docs.forEach(doc => {
              messageBatch.update(doc.ref, { isRead: true });
            });
          }
          await messageBatch.commit();
          break;

        case 'vendors':
          // Mark vendor comments as read
          const vendorCommentsRef = collection(db, `users/${user.uid}/vendorComments`);
          const vendorQuery = query(
            vendorCommentsRef,
            where('isRead', '==', false)
          );
          const vendorSnapshot = await getDocs(vendorQuery);
          const vendorBatch = writeBatch(db);
          vendorSnapshot.docs.forEach(doc => {
            vendorBatch.update(doc.ref, { isRead: true });
          });
          await vendorBatch.commit();
          break;

        case 'budget':
          // Budget notifications resolve when budget is fixed, so we don't mark as read
          // They'll disappear when the budget issue is resolved
          break;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setNotificationCounts({
        messages: 0,
        todo: 0,
        todoAssigned: 0,
        budget: 0,
        vendors: 0,
        total: 0
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribeFunctions: (() => void)[] = [];
    
    // Set up listeners for user

    // Listen for unread messages across all contacts - ENABLED with optimizations
    const setupMessageListener = async () => {
      // TODO: Implement efficient message counting without 20+ listeners per hook instance
      try {
        const contactsRef = collection(db, `users/${user.uid}/contacts`);
        const contactsSnapshot = await getDocs(contactsRef);
        
        // Limit to first 20 contacts to avoid overwhelming the database
        const limitedContacts = contactsSnapshot.docs.slice(0, 20);
        
        // Set up real-time listeners for unread messages - FIXED aggregation
        const messageListeners: (() => void)[] = [];
        const contactMessageCounts = new Map<string, number>();
        
        limitedContacts.forEach(contactDoc => {
          const contactId = contactDoc.id;
          const contactData = contactDoc.data();
          const contactEmail = contactData.email;
          
          // Use contactEmail as the path since that's how messages are stored
          if (contactEmail) {
            const messagesRef = collection(db, `users/${user.uid}/contacts/${contactEmail}/messages`);
            const q = query(
              messagesRef,
              where('isRead', '==', false),
              where('direction', '==', 'received'),
              limit(10) // Limit to first 10 unread messages per contact
            );
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
              // Update the count for this specific contact
              contactMessageCounts.set(contactId, snapshot.docs.length);
            
              // Update the contact unread counts state
              setContactUnreadCounts(Object.fromEntries(contactMessageCounts));
              
              // Calculate total unread messages across all contacts
              const totalUnreadMessages = Array.from(contactMessageCounts.values()).reduce((sum, count) => sum + count, 0);
              
              setNotificationCounts(prev => {
                const newTotal = prev.todoAssigned + prev.budget + prev.vendors + totalUnreadMessages;
                const newCounts = {
                  ...prev,
                  messages: totalUnreadMessages,
                  total: newTotal
                };

                return newCounts;
              });
            });
            
            messageListeners.push(unsubscribe);
          }
        });
        
        // Add all message listeners to the main unsubscribe array
        unsubscribeFunctions.push(...messageListeners);
        
      } catch (error) {
        console.error('Error setting up message listener:', error);
      }
    };

    // Listen for incomplete todo items - FIXED query to get all items
    const setupTodoListener = () => {
      try {
        const todoItemsRef = collection(db, `users/${user.uid}/todoItems`);
                  // Get all items and filter by isCompleted on the client side
          const q = query(
            todoItemsRef,
            orderBy('createdAt', 'desc')
          );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          let totalIncomplete = 0;
          let newAssignedCount = 0;

          snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            
            // Only count incomplete items (both false and undefined)
            if (!data.isCompleted) {
              totalIncomplete++;
            }
            
            // Check for new todos assigned by others (notifications)
            // This would need a 'notificationRead' field to track properly
            // For now, we'll count todos assigned by others as notifications
            if (data.assignedTo && Array.isArray(data.assignedTo) && data.assignedTo.includes(user.uid) && data.assignedBy && data.assignedBy !== user.uid && !data.notificationRead) {
              newAssignedCount++;
            }
          });



          setNotificationCounts(prev => {
            const newTotal = prev.messages + prev.budget + prev.vendors + newAssignedCount;
            const newCounts = {
              ...prev,
              todo: totalIncomplete, // This should show total incomplete items (15)
              todoAssigned: newAssignedCount, // This should show assigned items only
              total: newTotal
            };

            return newCounts;
          });
        });

        unsubscribeFunctions.push(unsubscribe);
      } catch (error) {
        console.error('Error setting up todo listener:', error);
      }
    };

    // Listen for budget alerts (overdue items, over-budget categories) - OPTIMIZED with limits
    const setupBudgetListener = () => {
      try {
        const budgetItemsRef = collection(db, `users/${user.uid}/budgetItems`);
        const q = query(
          budgetItemsRef,
          where('isOverBudget', '==', true),
          limit(50) // Limit to first 50 over-budget items for better performance
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          setNotificationCounts(prev => {
            const newBudget = snapshot.docs.length;
            const newTotal = prev.messages + prev.todoAssigned + prev.vendors + newBudget;
            return {
              ...prev,
              budget: newBudget,
              total: newTotal
            };
          });
        });

        unsubscribeFunctions.push(unsubscribe);
      } catch (error) {
        console.error('Error setting up budget listener:', error);
      }
    };

    // Listen for vendor updates (new comments, flagged items) - OPTIMIZED with limits
    const setupVendorListener = () => {
      try {
        const vendorCommentsRef = collection(db, `users/${user.uid}/vendorComments`);
        const q = query(
          vendorCommentsRef,
          where('isRead', '==', false),
          limit(50) // Limit to first 50 unread vendor comments for better performance
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          setNotificationCounts(prev => {
            const newVendors = snapshot.docs.length;
            const newTotal = prev.messages + prev.todoAssigned + prev.budget + newVendors;
            return {
              ...prev,
              vendors: newVendors,
              total: newTotal
            };
          });
        });

        unsubscribeFunctions.push(unsubscribe);
        } catch (error) {
          console.error('Error setting up vendor listener:', error);
        }
      };

    // Set up all listeners
    setupMessageListener();
    setupTodoListener();
    setupBudgetListener();
    setupVendorListener();

    setLoading(false);

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.uid]);

  return {
    notificationCounts,
    loading,
    markNotificationAsRead,
    contactUnreadCounts
  };
} 