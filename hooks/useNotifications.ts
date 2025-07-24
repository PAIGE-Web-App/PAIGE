import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
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

    // Listen for unread messages across all contacts
    const setupMessageListener = async () => {
      try {
        const contactsRef = collection(db, `users/${user.uid}/contacts`);
        const contactsSnapshot = await getDocs(contactsRef);
        
        contactsSnapshot.docs.forEach(contactDoc => {
          const contactId = contactDoc.id;
          const messagesRef = collection(db, `users/${user.uid}/contacts/${contactId}/messages`);
          const q = query(
            messagesRef,
            where('isRead', '==', false),
            where('direction', '==', 'received')
          );

          const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotificationCounts(prev => {
              const newMessages = snapshot.docs.length;
              const newTotal = prev.todo + prev.budget + prev.vendors + newMessages;
              return {
                ...prev,
                messages: newMessages,
                total: newTotal
              };
            });
          });

          unsubscribeFunctions.push(unsubscribe);
        });
      } catch (error) {
        console.error('Error setting up message listener:', error);
      }
    };

    // Listen for incomplete todo items
    const setupTodoListener = () => {
      try {
        const todoItemsRef = collection(db, `users/${user.uid}/todoItems`);
        const q = query(
          todoItemsRef,
          where('isCompleted', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          let totalIncomplete = 0;
          let newAssignedCount = 0;

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            totalIncomplete++;
            
            // Check for new todos assigned by others (notifications)
            // This would need a 'notificationRead' field to track properly
            // For now, we'll count todos assigned by others as notifications
            if (data.assignedTo && Array.isArray(data.assignedTo) && data.assignedTo.includes(user.uid) && !data.notificationRead) {
              newAssignedCount++;
            }
          });

          setNotificationCounts(prev => {
            const newTotal = prev.messages + prev.budget + prev.vendors + newAssignedCount;
            return {
              ...prev,
              todo: totalIncomplete,
              todoAssigned: newAssignedCount,
              total: newTotal
            };
          });
        });

        unsubscribeFunctions.push(unsubscribe);
      } catch (error) {
        console.error('Error setting up todo listener:', error);
      }
    };

    // Listen for budget alerts (overdue items, over-budget categories)
    const setupBudgetListener = () => {
      try {
        const budgetItemsRef = collection(db, `users/${user.uid}/budgetItems`);
        const q = query(
          budgetItemsRef,
          where('isOverBudget', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          setNotificationCounts(prev => {
            const newBudget = snapshot.docs.length;
            const newTotal = prev.messages + prev.todo + prev.vendors + newBudget;
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

    // Listen for vendor updates (new comments, flagged items)
    const setupVendorListener = () => {
      try {
        const vendorCommentsRef = collection(db, `users/${user.uid}/vendorComments`);
        const q = query(
          vendorCommentsRef,
          where('isRead', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          setNotificationCounts(prev => {
            const newVendors = snapshot.docs.length;
            const newTotal = prev.messages + prev.todo + prev.budget + newVendors;
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
    loading
  };
} 