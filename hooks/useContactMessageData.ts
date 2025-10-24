import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs } from 'firebase/firestore';
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

// Cache for contact message data to prevent unnecessary re-fetches
const messageDataCache = new Map<string, { data: ContactMessageData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Prevent memory leaks by limiting cache size

// Cleanup function to prevent memory leaks
const cleanupCache = () => {
  if (messageDataCache.size > MAX_CACHE_SIZE) {
    const now = Date.now();
    const entries = Array.from(messageDataCache.entries());
    
    // Remove expired entries first
    entries.forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_DURATION) {
        messageDataCache.delete(key);
      }
    });
    
    // If still too large, remove oldest entries
    if (messageDataCache.size > MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .filter(([key]) => messageDataCache.has(key))
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = sortedEntries.slice(0, messageDataCache.size - MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => messageDataCache.delete(key));
    }
  }
};

import { logger } from '@/utils/logger';

export const useContactMessageData = (
  contacts: Contact[],
  userId: string | null
): UseContactMessageDataReturn => {
  const [contactMessageData, setContactMessageData] = useState<Map<string, ContactMessageData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribesRef = useRef<(() => void)[]>([]);
  const isMountedRef = useRef(true);

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

  // Optimized batch fetching for contact message data
  const fetchContactMessageData = useCallback(async (contacts: Contact[]) => {
    if (!userId || contacts.length === 0) return new Map();

    const contactDataMap = new Map<string, ContactMessageData>();
    const now = Date.now();

    // Check cache first
    const uncachedContacts: Contact[] = [];
    contacts.forEach(contact => {
      const cached = messageDataCache.get(contact.id);
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        contactDataMap.set(contact.id, cached.data);
      } else {
        uncachedContacts.push(contact);
      }
    });

    // Only fetch uncached data
    if (uncachedContacts.length > 0) {
      try {
        // Batch fetch latest messages for all uncached contacts
        const promises = uncachedContacts.map(async (contact) => {
          try {
            // Use contact email as the path since that's how messages are stored
            const contactEmail = contact.email;
            if (!contactEmail) {
              const data = { unreadCount: 0 };
              contactDataMap.set(contact.id, data);
              return;
            }
            
            const messagesRef = collection(db, `users/${userId}/contacts/${contactEmail}/messages`);
            const messagesQuery = query(
              messagesRef,
              orderBy("createdAt", "desc"),
              limit(1)
            );
            
            const snapshot = await getDocs(messagesQuery);
            
            if (snapshot.empty) {
              const data = { unreadCount: 0 };
              contactDataMap.set(contact.id, data);
              messageDataCache.set(contact.id, { data, timestamp: now });
              cleanupCache(); // Prevent memory leaks
              return;
            }

            const latestMessage = snapshot.docs[0].data() as Message;
            const data = {
              lastMessageTime: formatMessageTime(latestMessage.createdAt || latestMessage.timestamp),
              lastMessageSnippet: formatMessageSnippet(latestMessage, userId),
              unreadCount: latestMessage.isRead === false ? 1 : 0
            };
            
            contactDataMap.set(contact.id, data);
            messageDataCache.set(contact.id, { data, timestamp: now });
            cleanupCache(); // Prevent memory leaks
          } catch (err) {
            logger.debug(`Error fetching messages for contact ${contact.id}:`, err);
            const data = { unreadCount: 0 };
            contactDataMap.set(contact.id, data);
          }
        });

        await Promise.all(promises);
      } catch (err) {
        logger.error('Error in batch fetch:', err);
      }
    }

    return contactDataMap;
  }, [userId, formatMessageSnippet, formatMessageTime]);

  useEffect(() => {
    if (!userId || contacts.length === 0) {
      setContactMessageData(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Clean up previous listeners
    unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribesRef.current = [];
    
    // Initial batch fetch
    fetchContactMessageData(contacts).then(dataMap => {
      if (isMountedRef.current) {
        setContactMessageData(dataMap);
        setLoading(false);
      }
    });

    // DISABLED: Real-time listeners for contact messages
    // This was causing excessive Firestore reads (24k+ per day)
    // Contact message data will still work via batch fetching above
    // Users can refresh the page to get updated message data
    
    // Periodic refresh every 30 seconds to maintain real-time feel
    // This reduces reads from continuous listeners to periodic batch updates
    const refreshInterval = setInterval(() => {
      if (isMountedRef.current && userId && contacts.length > 0) {
        fetchContactMessageData(contacts).then(dataMap => {
          if (isMountedRef.current) {
            setContactMessageData(dataMap);
          }
        }).catch(err => {
          logger.error('Error in periodic refresh:', err);
        });
      }
    }, 30 * 1000); // 30 seconds - faster updates for better UX

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      clearInterval(refreshInterval);
      unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
    };
  }, [contacts, userId, fetchContactMessageData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  return {
    contactMessageData,
    loading,
    error
  };
};
