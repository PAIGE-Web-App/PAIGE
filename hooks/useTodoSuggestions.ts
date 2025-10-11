import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Hook to track pending todo suggestions across all contacts
 * Returns a map of contactId -> suggestion count
 * 
 * Used to show purple AI badges on contacts with pending suggestions
 */
export function useTodoSuggestions(userId: string | null, contactIds: string[] = []) {
  const [suggestionCounts, setSuggestionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || contactIds.length === 0) {
      setSuggestionCounts({});
      setLoading(false);
      return;
    }

    // Set up listeners for each contact's pending suggestions
    const unsubscribes: (() => void)[] = [];

    // Limit to first 20 contacts to avoid performance issues
    const contactsToWatch = contactIds.slice(0, 20);

    contactsToWatch.forEach((contactId) => {
      const contactRef = firestoreDoc(db, `users/${userId}/contacts`, contactId);
      
      const unsubscribe = onSnapshot(
        contactRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const pendingData = data?.pendingTodoSuggestions;
            
            // Only show badge if status is 'pending' and count > 0
            const count = 
              pendingData?.status === 'pending' && pendingData?.count > 0 
                ? pendingData.count 
                : 0;
            
            setSuggestionCounts((prev) => ({
              ...prev,
              [contactId]: count
            }));
          }
        },
        (error) => {
          console.error(`Error listening to suggestions for contact ${contactId}:`, error);
        }
      );

      unsubscribes.push(unsubscribe);
    });

    setLoading(false);

    // Cleanup function
    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [userId, contactIds.join(',')]); // Use join to create stable dependency

  return { suggestionCounts, loading };
}

