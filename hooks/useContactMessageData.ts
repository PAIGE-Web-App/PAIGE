import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Contact } from '@/types/contact';
import { Message } from '@/types/message';

interface ContactMessageData {
  lastMessageTime?: Date;
  lastMessageSnippet?: string;
  unreadCount: number;
}

interface UseContactMessageDataReturn {
  contactMessageData: Map<string, ContactMessageData>;
  loading: boolean;
  error: string | null;
}

export const useContactMessageData = (
  contacts: Contact[],
  userId: string | null
): UseContactMessageDataReturn => {
  const [contactMessageData, setContactMessageData] = useState<Map<string, ContactMessageData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatMessageSnippet = useCallback((message: any, currentUserId: string): string => {
    if (!message) return 'No messages yet';
    
    // Check if the user sent this message using the direction field
    const isFromUser = message.direction === 'sent' || message.direction === 'outbound';
    const prefix = isFromUser ? 'You: ' : '';
    const content = message.body || message.content || message.text || '';
    
    // Truncate to 50 characters
    const truncated = content.length > 50 ? content.substring(0, 50) + '...' : content;
    
    return prefix + truncated;
  }, []);

  const formatMessageTime = useCallback((timestamp: any): Date => {
    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    // Handle Date objects
    if (timestamp instanceof Date) return timestamp;
    // Handle string timestamps
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    // Handle numeric timestamps
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    return new Date();
  }, []);

  useEffect(() => {
    if (!userId || contacts.length === 0) {
      setContactMessageData(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribes: (() => void)[] = [];
    const contactDataMap = new Map<string, ContactMessageData>();

    // Set up listeners for each contact's messages
    contacts.forEach((contact) => {
      try {
        const messagesRef = collection(db, `users/${userId}/contacts/${contact.id}/messages`);
        
        // Query for the most recent message (limit 1, ordered by timestamp desc)
        const messagesQuery = query(
          messagesRef,
          orderBy("timestamp", "desc"),
          limit(1)
        );

        const unsubscribe = onSnapshot(
          messagesQuery,
          (snapshot) => {
            if (snapshot.empty) {
              // No messages for this contact
              console.log(`No messages found for contact ${contact.name}`);
              contactDataMap.set(contact.id, {
                unreadCount: 0
              });
            } else {
              const latestMessage = snapshot.docs[0].data() as Message;
              const timestamp = latestMessage.timestamp;
              
              console.log(`Latest message for ${contact.name}:`, {
                direction: latestMessage.direction,
                timestamp: timestamp,
                body: latestMessage.body?.substring(0, 50),
                isRead: latestMessage.isRead
              });
              
              contactDataMap.set(contact.id, {
                lastMessageTime: formatMessageTime(timestamp),
                lastMessageSnippet: formatMessageSnippet(latestMessage, userId),
                unreadCount: latestMessage.isRead === false ? 1 : 0 // Simple unread count - only count if latest message is unread
              });
            }

            // Update the map with all contact data
            setContactMessageData(new Map(contactDataMap));
            setLoading(false);
          },
          (err) => {
            console.error(`Error fetching messages for contact ${contact.id}:`, err);
            setError(`Failed to load messages for ${contact.name}`);
            setLoading(false);
          }
        );

        unsubscribes.push(unsubscribe);
      } catch (err) {
        console.error(`Error setting up listener for contact ${contact.id}:`, err);
      }
    });

    // Cleanup function
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [contacts, userId, formatMessageSnippet, formatMessageTime]);

  return {
    contactMessageData,
    loading,
    error
  };
};
