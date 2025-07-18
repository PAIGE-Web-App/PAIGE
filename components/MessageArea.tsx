// components/MessageArea.tsx
"use client"; // Important for client-side functionality

import React, { useEffect, useRef, useState, useReducer, useCallback, useMemo } from "react";

// Development-only logging
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};
import { v4 as uuidv4 } from "uuid";
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs, limit, doc, setDoc, updateDoc, deleteDoc, Timestamp, startAfter, getDocsFromCache, getDoc, writeBatch } from "firebase/firestore";
import { User } from "firebase/auth";
import { Mail, Phone, FileUp, SmilePlus, WandSparkles, MoveRight, File, ArrowLeft, X } from "lucide-react";
import CategoryPill from "./CategoryPill";
import { db, getUserCollectionRef } from "../lib/firebase";
import { useCustomToast } from "../hooks/useCustomToast"; // Make sure this path is correct relative to MessageArea.tsx
import { AnimatePresence, motion } from "framer-motion";
import { Contact } from "../types/contact";
import { Message } from "../types/message";
import MessageListArea from './MessageListArea';
import MessageDraftArea from './MessageDraftArea';
import Banner from "./Banner";
import LoadingBar from "./LoadingBar";
import { useRouter } from "next/navigation";
import GmailReauthNotification from './GmailReauthNotification';
import GmailReauthBanner from './GmailReauthBanner';
import DropdownMenu, { DropdownItem } from './DropdownMenu';
import GmailImportConfigModal, { ImportConfig } from './GmailImportConfigModal';


// Define interfaces for types needed in this component

interface MessageAreaProps {
  selectedContact: Contact | null;
  currentUser: User | null;
  isAuthReady: boolean;
  contacts: Contact[];
  isMobile: boolean;
  setActiveMobileTab: (tab: "contacts" | "messages" | "todo") => void;
  input: string;
  setInput: (input: string) => void;
  draftLoading: boolean;
  generateDraft: () => Promise<string>;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  contactsLoading: boolean;
  setIsEditing: (isEditing: boolean) => void;
  onContactSelect: (contact: Contact) => void;
  onSetupInbox: () => void;
  userName?: string;
  jiggleEmailField?: boolean;
  setJiggleEmailField?: (jiggle: boolean) => void;
}

const getRelativeDate = (dateInput: Date | string): string => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

    const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

    if (isToday) {
        return "Today";
    } else if (isYesterday) {
        return "Yesterday";
    } else {
        return date.toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "2-digit",
        });
    }
};

const MessagesSkeleton = () => (
  <div className="space-y-4 p-3 animate-pulse">
    {/* Received Message Skeleton */}
    <div
      key="received-skeleton"
      className="max-w-[80%] px-3 py-2 rounded-[15px_15px_15px_0] mr-auto bg-gray-50"
    >
      <div className="h-3 rounded mb-1 bg-gray-200 w-1/2"></div>
      <div className="h-4 rounded bg-gray-200 w-full"></div>
      <div className="h-4 rounded mt-1 bg-gray-200 w-4/5"></div>
    </div>

    {/* Sent Message Skeleton */}
    <div
      key="sent-skeleton"
      className="max-w-[80%] px-3 py-2 rounded-[15px_15px_0_15px] ml-auto bg-gray-100"
    >
      <div className="h-3 rounded mb-1 bg-gray-200 w-2/3 ml-auto"></div>
      <div className="h-4 rounded bg-gray-200 w-full"></div>
      <div className="h-4 rounded mt-1 bg-gray-200 w-3/4 ml-auto"></div>
    </div>
  </div>
);

const EmojiPicker = ({ onEmojiSelect, onClose }: { onEmojiSelect: (emoji: string) => void; onClose: () => void }) => {
  const emojis = ['😀', '😁', '😂', '🤣', '😃', '😅', '😆', '🥹', '😊', '😋', '😎', '😍', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😮', '🤐', '😯', '😴', '😫', '😩', '😤', '😡', '😠', '🤬', '😈', '👿', '👹', '👺', '💀', '👻', '👽', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  return (
    <div className="p-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 flex flex-wrap gap-1">
      {emojis.map((emoji, index) => (
        <button
          key={index}
          className="p-1 text-lg hover:bg-gray-100 rounded"
          onClick={() => {
            onEmojiSelect(emoji);
            onClose();
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

type MessageState = {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  lastDoc: any | null;
  isInitialLoad: boolean;
};

type MessageAction = 
  | { type: 'RESET' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'APPEND_MESSAGES'; payload: Message[] }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'SET_LAST_DOC'; payload: any }
  | { type: 'SET_INITIAL_LOAD'; payload: boolean };

const messageReducer = (state: MessageState, action: MessageAction): MessageState => {
  switch (action.type) {
    case 'RESET':
      return { messages: [], loading: false, hasMore: true, lastDoc: null, isInitialLoad: true };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload, loading: false, isInitialLoad: false };
    case 'APPEND_MESSAGES':
      return { ...state, messages: [...state.messages, ...action.payload], loading: false };
    case 'SET_HAS_MORE':
      return { ...state, hasMore: action.payload };
    case 'SET_LAST_DOC':
      return { ...state, lastDoc: action.payload };
    case 'SET_INITIAL_LOAD':
      return { ...state, isInitialLoad: action.payload };
    default:
      return state;
  }
};

// Helper to convert File objects to base64 attachments
async function filesToBase64(files: File[]): Promise<{ name: string; type: string; data: string }[]> {
  const promises = files.map(file => {
    return new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ name: file.name, type: file.type, data: (reader.result as string).split(',')[1] });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  });
  return Promise.all(promises);
}

const MessageArea: React.FC<MessageAreaProps> = ({
  selectedContact,
  currentUser,
  isAuthReady,
  contacts,
  isMobile,
  setActiveMobileTab,
  input,
  setInput,
  draftLoading,
  generateDraft,
  selectedFiles,
  setSelectedFiles,
  contactsLoading,
  setIsEditing,
  onContactSelect,
  onSetupInbox,
  userName,
  jiggleEmailField,
  setJiggleEmailField,
}) => {
  const router = useRouter();
  const [state, dispatch] = useReducer(messageReducer, { 
    messages: [], 
    loading: false, 
    hasMore: true, 
    lastDoc: null,
    isInitialLoad: true 
  });
  const [selectedChannel, setSelectedChannel] = useState("Gmail");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [animatedDraft, setAnimatedDraft] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const isMounted = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const prevContactIdRef = useRef<string | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast();

  const [pendingDraft, setPendingDraft] = useState<string | null>(null); // For AI draft
  const [showGmailImport, setShowGmailImport] = useState(false);
  const [checkingGmail, setCheckingGmail] = useState(false);
  const [showGmailBanner, setShowGmailBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [importedOnce, setImportedOnce] = useState(false);
  const [gmailAccountMismatch, setGmailAccountMismatch] = useState<{
    hasMismatch: boolean;
    existingAccount: string | null;
    currentAccount: string | null;
  } | null>(null);

  // New state for vendor contact information
  const [vendorDetails, setVendorDetails] = useState<any>(null);
  const [vendorContactLoading, setVendorContactLoading] = useState(false);
  const [hasContactInfo, setHasContactInfo] = useState<boolean | null>(null);
  
  // Add a cache for vendor details to prevent flickering
  const MAX_CACHE_SIZE = 50;
  const vendorDetailsCache = useRef<{[placeId: string]: any}>({});
  const currentPlaceIdRef = useRef<string | null>(null);
  
  // Helper function to add to cache with size limits
  const addToVendorCache = (placeId: string, data: any) => {
    const cache = vendorDetailsCache.current;
    if (Object.keys(cache).length >= MAX_CACHE_SIZE) {
      const firstKey = Object.keys(cache)[0];
      delete cache[firstKey];
    }
    cache[placeId] = data;
  };
  
  // Set default channel based on available contact info
  useEffect(() => {
    if (selectedContact) {
      const hasEmail = selectedContact.email || (vendorDetails?.emails && vendorDetails.emails.length > 0);
      const hasPhone = selectedContact.phone || vendorDetails?.formatted_phone_number;
      
      // If only phone is available, default to In-App Message
      if (!hasEmail && hasPhone) {
        setSelectedChannel("InApp");
      } else if (hasEmail) {
        // If email is available, default to Gmail
        setSelectedChannel("Gmail");
      }
    }
  }, [selectedContact?.email, selectedContact?.phone, vendorDetails?.emails, vendorDetails?.formatted_phone_number]);

  // Add a cache for Gmail eligibility per contact
  const [gmailEligibilityCache, setGmailEligibilityCache] = useState<{
    [contactId: string]: {
      showGmailImport: boolean;
      showGmailBanner: boolean;
      bannerDismissed: boolean;
      importedOnce: boolean;
      gmailAccountMismatch: boolean;
    }
  }>({});

  // Add reply state
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  
  // Add re-authentication state
  const [showReauthNotification, setShowReauthNotification] = useState(false);
  const [showReauthBanner, setShowReauthBanner] = useState(false);

  const clearReply = () => setReplyingToMessage(null);



  const handleDeleteMessage = async (message: Message) => {
    if (!selectedContact || !currentUser) return;
    
    try {
      // Remove from local state immediately for responsive UI
      dispatch({ type: 'SET_MESSAGES', payload: state.messages.filter(m => m.id !== message.id) });
      
      // Delete from Firestore using the correct nested path
      const messageRef = doc(db, `users/${currentUser.uid}/contacts/${selectedContact.id}/messages`, message.id);
      await deleteDoc(messageRef);
      
      // Show success toast
      showSuccessToast('Message removed successfully!');
    } catch (error) {
      console.error('Error deleting message:', error);
      
      // Revert local state if deletion failed
      dispatch({ type: 'SET_MESSAGES', payload: [...state.messages, message] });
      
      // Show error toast
      showErrorToast('Failed to remove message. Please try again.');
    }
  };

  // Auto-expand textarea as input changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 260) + 'px';
    }
  }, [input]);

  // When AI draft is ready, set it after loading is done
  useEffect(() => {
    if (!draftLoading && pendingDraft !== null) {
      setInput(pendingDraft);
      setPendingDraft(null);
    }
  }, [draftLoading, pendingDraft, setInput]);

  // Update textarea height whenever input or animatedDraft changes
  useEffect(() => {
    if (textareaRef.current) {
      const text = isAnimating ? animatedDraft : input;
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input, animatedDraft, isAnimating]);

  const loadMoreMessages = useCallback(async () => {
    if (!state.hasMore || state.loading || !currentUser?.uid || !selectedContact?.id) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const messagesRef = collection(db, `users/${currentUser.uid}/contacts/${selectedContact.id}/messages`);
      
      let messagesQuery;
      if (state.lastDoc) {
        messagesQuery = query(
          messagesRef,
          orderBy("timestamp", "asc"),
          startAfter(state.lastDoc),
          limit(50)
        );
      } else {
        messagesQuery = query(
          messagesRef,
          orderBy("timestamp", "asc"),
          limit(50)
        );
      }

      const snapshot = await getDocs(messagesQuery);
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      
      const newMessages = snapshot.docs.map(doc => {
        const data = doc.data() as Record<string, any>;
        const timestamp = data.timestamp?.toDate?.() || new Date();
        return {
          ...data,
          id: doc.id,
          timestamp: timestamp.toLocaleString()
        } as Message;
      });

      dispatch({ type: 'APPEND_MESSAGES', payload: newMessages });
      dispatch({ type: 'SET_LAST_DOC', payload: lastVisible });
      dispatch({ type: 'SET_HAS_MORE', payload: snapshot.docs.length === 50 });
    } catch (error) {
      console.error('Error loading more messages:', error);
      showErrorToast('Failed to load more messages');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.hasMore, state.loading, state.lastDoc, currentUser?.uid, selectedContact?.id]);

  // Handle scroll to load more messages
  const handleScroll = useCallback(() => {
    if (!messagesEndRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesEndRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) { // Load more when within 100px of bottom
      loadMoreMessages();
    }
  }, [loadMoreMessages]);

  // Initial message load
  useEffect(() => {
    isMounted.current = true;

    // Always reset state and unsubscribe at the start
    dispatch({ type: 'RESET' });
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const currentContactId = selectedContact?.id;
    const currentUserId = currentUser?.uid;

    if (!currentContactId || !currentUserId) {
      prevContactIdRef.current = null;
      prevUserIdRef.current = null;
      return;
    }

    prevContactIdRef.current = currentContactId;
    prevUserIdRef.current = currentUserId;
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const messagesRef = collection(db, `users/${currentUserId}/contacts/${currentContactId}/messages`);
      const messagesQuery = query(
        messagesRef,
        orderBy("timestamp", "asc"),
        limit(50)
      );

      unsubscribeRef.current = onSnapshot(messagesQuery, (snapshot) => {
        if (!isMounted.current) return;

        const fetchedMessages = snapshot.docs.map(doc => {
          const data = doc.data() as Record<string, any>;
          const timestamp = data.timestamp?.toDate?.() || new Date();
          return {
            ...data,
            id: doc.id,
            timestamp: timestamp.toLocaleString()
          } as Message;
        });

        dispatch({ type: 'SET_MESSAGES', payload: fetchedMessages });
        dispatch({ type: 'SET_LAST_DOC', payload: snapshot.docs[snapshot.docs.length - 1] });
        dispatch({ type: 'SET_HAS_MORE', payload: snapshot.docs.length === 50 });
        dispatch({ type: 'SET_LOADING', payload: false });
      }, (error) => {
        console.error('Firestore listener error:', error);
        if (isMounted.current) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      });
    } catch (error) {
      if (!isMounted.current) return;
      console.error('MessageArea: Error setting up messages listener:', error);
      showErrorToast('Failed to fetch messages. Please try again.');
      dispatch({ type: 'SET_LOADING', payload: false });
    }

    return () => {
      isMounted.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [selectedContact?.id, currentUser?.uid]);

  const [subject, setSubject] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isImportingGmail, setIsImportingGmail] = useState(false);
  const [isCheckingGmail, setIsCheckingGmail] = useState(false);
  const [showImportConfigModal, setShowImportConfigModal] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;
    if (!selectedContact || !currentUser) return;
    const userEmail = currentUser.email;
    if (!userEmail) {
      showErrorToast('User email not found. Please try again.');
      return;
    }
    try {
      setIsSending(true);
      let gmailMessageId: string | undefined;
      let threadId: string | undefined;
      
      // If replying to a Gmail message, send via Gmail API
      if (replyingToMessage && replyingToMessage.source === 'gmail') {
        const attachments = await filesToBase64(selectedFiles);
        const res = await fetch('/api/gmail-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: input,
            to: replyingToMessage.from,
            subject: replyingToMessage.subject,
            threadId: replyingToMessage.threadId,
            messageId: replyingToMessage.messageIdHeader,
            attachments,
            userId: currentUser.uid,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to send Gmail reply');
        showSuccessToast('Gmail reply sent!');
        
        // Extract Gmail message ID from response for local storage
        gmailMessageId = data.gmailRes?.id;
        threadId = data.gmailRes?.threadId;
      }
      // If sending a new Gmail message (not a reply)
      let usedSubject = subject || input.split('\n')[0] || 'New Message';
      
      if (!replyingToMessage && selectedChannel === 'Gmail') {
        const attachments = await filesToBase64(selectedFiles);
        const res = await fetch('/api/gmail-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: input,
            to: selectedContact.email,
            subject: usedSubject,
            threadId: undefined,
            messageId: undefined,
            attachments,
            userId: currentUser.uid,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          if (data.needsReauth) {
            setShowReauthNotification(true);
            setShowReauthBanner(true);
            return; // Don't throw error, just return
          }
          throw new Error(data.error || 'Failed to send Gmail message');
        }
        showSuccessToast('Gmail email sent!');
        
        // Extract Gmail message ID from response for local storage
        gmailMessageId = data.gmailRes?.id;
        threadId = data.gmailRes?.threadId;
      }
      
      // Handle in-app messaging
      if (selectedChannel === 'InApp') {
        // For in-app messages, we don't send via external APIs
        // Just save to Firestore and potentially send notifications
        const inAppMessageId = `inapp-${Date.now()}`;
        
        // Send notification to the contact (only for in-app messages)
        try {
          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.uid,
              contactId: selectedContact.id,
              messageId: inAppMessageId,
              messageBody: input,
              contactName: selectedContact.name,
              messageSource: 'inapp' // Only send notifications for in-app messages
            }),
          });
        } catch (error) {
          console.error('Failed to send notification:', error);
          // Don't fail the message send if notification fails
        }
        
        showSuccessToast('In-app message sent!');
      }
      
      // Always save to Firestore for local display
      const path = `users/${currentUser.uid}/contacts/${selectedContact.id}/messages`;
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: Message = {
        id: optimisticId,
        subject: replyingToMessage ? replyingToMessage.subject : (subject || input.split('\n')[0] || 'New Message'),
        body: input,
        timestamp: new Date().toLocaleString(),
        from: userEmail,
        to: selectedContact.email || '',
        source: (replyingToMessage && replyingToMessage.source === 'gmail') || selectedChannel === 'Gmail' ? 'gmail' : 'inapp',
        isRead: true,
        userId: currentUser.uid,
        ...(replyingToMessage && { parentMessageId: replyingToMessage.id }),
        direction: 'sent',
        ...(selectedFiles.length > 0 && { attachments: selectedFiles.map(f => ({ name: f.name })) }),
        ...(gmailMessageId && { gmailMessageId }),
        ...(threadId && { threadId }),
        ...(selectedChannel === 'InApp' && { inAppMessageId: `inapp-${Date.now()}` }),
      };
      dispatch({ type: 'SET_MESSAGES', payload: [...(state.messages || []), optimisticMessage] });
      const messageData = {
        ...optimisticMessage,
        id: '',
        timestamp: Timestamp.now(),
      };
      const messagesRef = collection(db, path);
      const docRef = await addDoc(messagesRef, messageData);
      await updateDoc(docRef, { id: docRef.id });
      setInput('');
      setSubject('');
      setSelectedFiles([]);
      clearReply();
    } catch (error) {
      console.error('Error sending message:', error);
      showErrorToast('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTabChange = (tab: "contacts" | "messages" | "todo") => {
    setActiveMobileTab(tab);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput(input + emoji);
  };

  const handleGenerateDraft = async () => {
    if (!selectedContact) return;
    try {
      setIsGenerating(true);
      
      // If replying to a message, generate a contextual response
      let draft;
      if (replyingToMessage) {
        // For replies, we need to call the draft API directly with reply context
        const res = await fetch("/api/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contact: selectedContact, 
            messages: [replyingToMessage.body],
            isReply: true,
            originalSubject: replyingToMessage.subject,
            originalFrom: replyingToMessage.from
          }),
        });
        const data = await res.json();
        draft = data.draft || "Failed to generate response";
      } else {
        // Generate a new message draft
        draft = await generateDraft();
      }
      
      if (draft) {
        // Replace placeholders with userName
        if (userName) {
          draft = draft.replace(/\[Your Name\]/g, userName).replace(/\[Your Full Name\]/g, userName);
        }
        // Try to extract subject if present
        const subjectMatch = draft.match(/^Subject:\s*(.+)$/im);
        let newSubject = subject;
        let newBody = draft;
        if (subjectMatch) {
          newSubject = subjectMatch[1].trim();
          // Remove the subject line from the body
          newBody = draft.replace(/^Subject:\s*.+$/im, '').trim();
        }
        // Replace placeholders in subject too
        if (userName) {
          newSubject = newSubject.replace(/\[Your Name\]/g, userName).replace(/\[Your Full Name\]/g, userName);
        }
        setSubject(newSubject);
        setIsAnimating(true);
        setAnimatedDraft("");
        // Pre-calculate the final height
        if (textareaRef.current) {
          textareaRef.current.value = newBody;
          const finalHeight = Math.min(textareaRef.current.scrollHeight, 200);
          textareaRef.current.style.height = finalHeight + 'px';
        }
        // Animate the text with much faster speed
        let currentText = "";
        const chunkSize = 15; // Process more characters at once for much faster animation
        for (let i = 0; i < newBody.length; i += chunkSize) {
          await new Promise(resolve => setTimeout(resolve, 2)); // Much faster animation
          currentText += newBody.slice(i, i + chunkSize);
          setAnimatedDraft(currentText);
        }
        setInput(newBody);
        setIsAnimating(false);
      }
    } catch (error) {
      console.error('Error generating draft:', error);
      showErrorToast('Failed to generate draft');
    } finally {
      setIsGenerating(false);
    }
  };

  // TEMP: Simple onSnapshot test
  useEffect(() => {
          const path = `users/${currentUser?.uid}/contacts/${selectedContact?.id}/messages`;
    if (!currentUser?.uid || !selectedContact?.id) return;
    const unsub = onSnapshot(collection(db, path), (snapshot) => {
      console.log('Simple onSnapshot test:', snapshot.docs.map(doc => doc.data()));
    }, (error) => {
      console.error('Simple onSnapshot error:', error);
    });
    return () => unsub();
  }, [currentUser?.uid, selectedContact?.id]);

  // Check Gmail authentication status
  const checkGmailAuthStatus = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const response = await fetch('/api/check-gmail-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, contactEmail: 'test@example.com' }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (data.message?.includes('Google authentication required') || 
            data.message?.includes('Failed to refresh Google authentication')) {
          setShowReauthBanner(true);
        }
      }
    } catch (error) {
      console.error('Error checking Gmail auth status:', error);
    }
  };

  // Check Gmail authentication status on component mount
  useEffect(() => {
    if (currentUser?.uid) {
      checkGmailAuthStatus();
    }
  }, [currentUser?.uid]);

  // Check Gmail eligibility for selected contact
  useEffect(() => {
    let isMounted = true;
    const checkGmailEligibility = async () => {
      if (!currentUser?.uid || !selectedContact?.email || !selectedContact?.id) return;
      // If cached, use it immediately
      const cached = gmailEligibilityCache[selectedContact.id];
      if (cached) {
        setShowGmailImport(cached.showGmailImport);
        setShowGmailBanner(cached.showGmailBanner);
        setBannerDismissed(cached.bannerDismissed);
        setImportedOnce(cached.importedOnce);
        return;
      }
      setShowGmailImport(false);
      setShowGmailBanner(false);
      setBannerDismissed(false);
      setImportedOnce(false);
      setCheckingGmail(true);
      try {
        // Check if user has Gmail tokens and if there is Gmail history for this contact
        const res = await fetch('/api/check-gmail-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid, contactEmail: selectedContact.email }),
        });
        const data = await res.json();
        
        // Check if this contact has been imported before
        const contactRef = doc(db, `users/${currentUser.uid}/contacts`, selectedContact.id);
        const contactSnap = await getDoc(contactRef);
        const contactData = contactSnap.data();
        const hasBeenImported = contactData?.gmailImported || false;
        const hasDismissedBanner = contactData?.gmailBannerDismissed || false;
        
        let showImport = false;
        let showBanner = false;
        let imported = false;
        let dismissed = false;
        if (data.hasHistory) {
          showImport = true;
          if (!hasBeenImported && !hasDismissedBanner) {
            showBanner = true;
          } else {
            imported = hasBeenImported;
            dismissed = hasDismissedBanner;
          }
        }
        if (isMounted) {
          setShowGmailImport(showImport);
          setShowGmailBanner(showBanner);
          setBannerDismissed(dismissed);
          setImportedOnce(imported);
          setGmailEligibilityCache(prev => ({
            ...prev,
            [selectedContact.id]: {
              showGmailImport: showImport,
              showGmailBanner: showBanner,
              bannerDismissed: dismissed,
              importedOnce: imported,
              gmailAccountMismatch: false,
            }
          }));
        }
      } catch (e) {
        console.error('Error checking Gmail eligibility:', e);
        // fail silently
      } finally {
        if (isMounted) setCheckingGmail(false);
    }
    };
    checkGmailEligibility();
    return () => { isMounted = false; };
  }, [currentUser?.uid, selectedContact?.id, selectedContact?.email]);

  // When importing or dismissing, update the cache as well
  const handleImportGmail = async () => {
    setShowImportConfigModal(true);
  };

  const handleConfiguredImportGmail = async (config: ImportConfig) => {
    if (!currentUser?.uid || !selectedContact?.id) return;
    try {
      setIsImportingGmail(true);
      setShowImportConfigModal(false);
      
      // First check if there's a Gmail account mismatch
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.data();
      const currentGmailAccount = userData?.googleTokens?.email;
      
      if (currentGmailAccount) {
        const mismatchCheck = await fetch('/api/check-gmail-account-mismatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: currentUser.uid, 
            contactId: selectedContact.id, 
            currentGmailAccount 
          }),
        });
        
        if (mismatchCheck.ok) {
          const mismatchData = await mismatchCheck.json();
          if (mismatchData.hasAccountMismatch) {
            const confirmed = window.confirm(
              `This contact has messages from a different Gmail account (${mismatchData.existingGmailAccount}). ` +
              `Importing will replace those messages with messages from your current account (${currentGmailAccount}). ` +
              `Do you want to continue?`
            );
            if (!confirmed) {
              setIsImportingGmail(false);
              return;
            }
          }
        }
      }
      
      // First check if there are any existing messages for this contact
      const messagesQuery = query(
        collection(db, `users/${currentUser.uid}/contacts/${selectedContact.id}/messages`),
        where('source', '==', 'gmail')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const existingMessages = messagesSnapshot.docs.map(doc => doc.data());
      const hasExistingMessages = existingMessages.some(msg => 
        msg.from === selectedContact.email || msg.to === selectedContact.email
      );

      // If there are existing messages, delete them first
      if (hasExistingMessages) {
        const batch = writeBatch(db);
        messagesSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      // Now proceed with the import
      const response = await fetch('/api/start-gmail-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser.uid, 
          contacts: [selectedContact],
          config: config
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import Gmail conversation');
      }

      // Mark the contact as imported
      const contactRef = doc(db, `users/${currentUser.uid}/contacts`, selectedContact.id);
      await updateDoc(contactRef, {
        gmailImported: true,
        lastImportDate: new Date().toISOString(),
        lastGmailAccount: currentGmailAccount // Track which Gmail account was used for import
      });

      showSuccessToast('Gmail conversation imported!');
      setImportedOnce(true);
      setShowGmailBanner(false);
      setBannerDismissed(false);
      setGmailEligibilityCache(prev => ({
        ...prev,
        [selectedContact.id]: {
          showGmailImport: true,
          showGmailBanner: false,
          bannerDismissed: false,
          importedOnce: true,
          gmailAccountMismatch: false,
        }
      }));
    } catch (error) {
      console.error('Error importing Gmail:', error);
      showErrorToast('Failed to import Gmail messages');
    } finally {
      setIsImportingGmail(false);
    }
  };

  const handleDismissBanner = async () => {
    if (!currentUser?.uid || !selectedContact?.id) return;
    try {
      // Mark the banner as dismissed in Firestore
      const contactRef = doc(db, `users/${currentUser.uid}/contacts`, selectedContact.id);
      await updateDoc(contactRef, {
        gmailBannerDismissed: true
      });
      setBannerDismissed(true);
      setShowGmailBanner(false);
      setGmailEligibilityCache(prev => ({
        ...prev,
        [selectedContact.id]: {
          showGmailImport: true,
          showGmailBanner: false,
          bannerDismissed: true,
          importedOnce: false,
          gmailAccountMismatch: false,
        }
      }));
    } catch (e) {
      console.error('Error dismissing banner:', e);
    }
  };

  // For button-triggered check
  const handleCheckNewGmail = async (userInitiated = false) => {
    if (!currentUser?.uid || !selectedContact?.email) return;
    try {
      if (userInitiated) setIsCheckingGmail(true);
      const response = await fetch('/api/check-gmail-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, contactEmail: selectedContact.email }),
      });
      if (!response.ok) {
        throw new Error('Failed to check for new Gmail messages');
      }
      const data = await response.json();
      if (userInitiated) {
        if (data.newMessages && data.newMessages.length > 0) {
          showSuccessToast(`${data.newMessages.length} new Gmail message(s) imported!`);
        } else {
          showInfoToast('No new Gmail messages found.');
        }
      }
    } catch (error) {
      console.error('Error checking for new Gmail messages:', error);
      if (userInitiated) showErrorToast('Failed to check for new Gmail messages');
    } finally {
      if (userInitiated) setIsCheckingGmail(false);
    }
  };

  useEffect(() => {
    if (showGmailImport && importedOnce && selectedContact && currentUser) {
      handleCheckNewGmail(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact?.id]);

  // Fetch vendor contact information when contact changes
  const fetchVendorContactInfo = useCallback(async () => {
    devLog('🔍 Checking vendor contact info for:', selectedContact?.name);
    devLog('🔍 Contact placeId:', selectedContact?.placeId);
    devLog('🔍 Contact email:', selectedContact?.email);
    devLog('🔍 Contact phone:', selectedContact?.phone);
    
    if (!selectedContact?.placeId) {
      devLog('❌ No placeId found, not a vendor contact');
      setHasContactInfo(null);
      // Only clear vendor details if we're switching to a different contact
      if (currentPlaceIdRef.current && currentPlaceIdRef.current !== selectedContact?.placeId) {
        devLog('🔍 Clearing vendor details due to contact switch');
        setVendorDetails(null);
        currentPlaceIdRef.current = null;
      }
      return;
    }

    // Check if we're switching to a different placeId
    if (currentPlaceIdRef.current && currentPlaceIdRef.current !== selectedContact.placeId) {
      devLog('🔍 Switching from placeId:', currentPlaceIdRef.current, 'to:', selectedContact.placeId);
      setVendorDetails(null);
    }
    
    currentPlaceIdRef.current = selectedContact.placeId;

    // Check cache first
    if (vendorDetailsCache.current[selectedContact.placeId]) {
      devLog('✅ Found vendor details in cache for placeId:', selectedContact.placeId);
      setVendorDetails(vendorDetailsCache.current[selectedContact.placeId]);
      return;
    }

    // Don't refetch if we already have vendor details for this placeId
    if (vendorDetails?.place_id === selectedContact.placeId) {
      devLog('✅ Already have vendor details for this placeId, skipping fetch');
      return;
    }

    setVendorContactLoading(true);
    try {
      // Fetch vendor details from Google Places API
      const response = await fetch(`/api/google-place-details?placeId=${selectedContact.placeId}`);
      const data = await response.json();
      
      devLog('🔍 Google Places API response:', data);
      
      if (data.status === 'OK' && data.result) {
        devLog('✅ Setting vendor details:', data.result);
        // Cache the vendor details with size limits
        addToVendorCache(selectedContact.placeId, data.result);
        setVendorDetails(data.result);
        
        // Check if vendor has any contact information
        const hasGooglePhone = data.result.formatted_phone_number;
        const hasGoogleWebsite = data.result.website;
        const hasContactEmail = selectedContact.email;
        const hasContactPhone = selectedContact.phone;
        
        devLog('🔍 Contact info check:', {
          hasGooglePhone,
          hasGoogleWebsite,
          hasContactEmail,
          hasContactPhone
        });
        
        // For messaging purposes, we need either an email address or a phone number
        // Website alone is not sufficient for messaging
        const hasMessagingContactInfo = !!(hasContactEmail || hasContactPhone || hasGooglePhone);
        
        // Also check for verified emails from our system
        const verifiedEmailsResponse = await fetch(`/api/vendor-emails?placeId=${selectedContact.placeId}`);
        const verifiedEmailsData = await verifiedEmailsResponse.json();
        
        devLog('🔍 Verified emails response:', verifiedEmailsData);
        
        const hasVerifiedEmails = verifiedEmailsData.emails && 
                                 verifiedEmailsData.emails.length > 0 && 
                                 verifiedEmailsData.emails.some((email: any) => email.email && email.email.trim() !== '');
        
        devLog('🔍 Has verified emails:', hasVerifiedEmails);
        
        const finalHasContactInfo = hasMessagingContactInfo || hasVerifiedEmails;
        devLog('🔍 Final hasContactInfo result:', finalHasContactInfo);
        
        setHasContactInfo(finalHasContactInfo);
      } else {
        devLog('❌ Google Places API failed:', data);
        setHasContactInfo(false);
      }
    } catch (error) {
      console.error('❌ Error fetching vendor contact info:', error);
      setHasContactInfo(false);
    } finally {
      setVendorContactLoading(false);
    }
  }, [selectedContact?.placeId, selectedContact?.email, selectedContact?.phone, vendorDetails?.place_id, addToVendorCache]);

  // Effect to fetch vendor details when a vendor contact is selected
  useEffect(() => {
    fetchVendorContactInfo();
  }, [fetchVendorContactInfo]);

  // Debug effect to track vendor details changes
  useEffect(() => {
    devLog('🔍 vendorDetails state changed:', {
      vendorDetails: vendorDetails,
      hasVendorDetails: !!vendorDetails,
      vendorPlaceId: vendorDetails?.place_id,
      vendorWebsite: vendorDetails?.website,
      vendorPhone: vendorDetails?.formatted_phone_number,
      selectedContactId: selectedContact?.id,
      selectedContactName: selectedContact?.name
    });
  }, [vendorDetails?.place_id, vendorDetails?.website, vendorDetails?.formatted_phone_number, selectedContact?.id, selectedContact?.name]);

  devLog('UI messages:', state.messages);

  return (
    <div className="flex flex-col h-full">
      {selectedContact && (
        <>
          <div className="bg-[#F3F2F0] w-full p-3 border-b border-[#AB9C95] flex flex-col relative overflow-visible">
            {/* Top row: Back button (mobile) and name/category */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {isMobile && (
                  <button
                    onClick={() => setActiveMobileTab('contacts')}
                    className="mr-2 p-1 rounded-full hover:bg-[#E0DBD7] text-[#332B42]"
                    aria-label="Back to contacts"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h4 className="text-[16px] font-medium text-[#332B42] leading-tight font-playfair mr-1">
                  {selectedContact.name}
                </h4>
                <CategoryPill category={selectedContact.category} />
              </div>
              
              {/* Actions on the right */}
              <div className="flex items-center gap-2 flex-nowrap">
                {showGmailImport && (bannerDismissed || importedOnce) && selectedContact?.email && (
                  <DropdownMenu
                    trigger={
                      <button
                        className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0] flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
                        disabled={isImportingGmail || isCheckingGmail}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" viewBox="52 42 88 66" xmlns="http://www.w3.org/2000/svg">
                          <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/>
                          <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/>
                          <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/>
                          <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/>
                          <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/>
                        </svg>
                        <span className="truncate">Gmail Actions</span>
                        <svg className="w-3 h-3 flex-shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    }
                    items={[
                      {
                        label: 'Check for New Emails',
                        icon: <WandSparkles className="w-4 h-4" />,
                        onClick: () => handleCheckNewGmail(true)
                      },
                      {
                        label: importedOnce ? 'Re-import Emails' : 'Import Emails',
                        icon: <FileUp className="w-4 h-4" />,
                        onClick: handleImportGmail
                      }
                    ]}
                    width={220}
                    zIndex={50}
                    align="right"
                  />
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0] flex-shrink-0 whitespace-nowrap"
                >
                  Edit
                </button>
              </div>
            </div>
            
            {/* Bottom row: Contact metadata */}
            <div className="flex items-center gap-2 flex-wrap">
              {useMemo(() => {
                devLog('🔍 Header contact info debug:', {
                  contactEmail: selectedContact.email,
                  contactPhone: selectedContact.phone,
                  contactWebsite: selectedContact.website,
                  vendorPhone: vendorDetails?.formatted_phone_number,
                  vendorWebsite: vendorDetails?.website,
                  vendorPlaceId: vendorDetails?.place_id,
                  vendorDetailsExists: !!vendorDetails
                });
                
                return null;
              }, [selectedContact?.email, selectedContact?.phone, selectedContact?.website, vendorDetails?.formatted_phone_number, vendorDetails?.website, vendorDetails?.place_id, vendorDetails])}
              
              {selectedContact.email ? (
                <button
                  type="button"
                  onClick={() => router.push(`/?contactId=${selectedContact.id}`)}
                  className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 focus:outline-none flex-shrink-0"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[120px] md:max-w-[150px]">{selectedContact.email}</span>
                </button>
              ) : (selectedContact.phone || vendorDetails?.formatted_phone_number) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setJiggleEmailField?.(true);
                    setTimeout(() => setJiggleEmailField?.(false), 1000);
                  }}
                  className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 focus:outline-none flex-shrink-0"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[120px] md:max-w-[150px]">Add email address</span>
                </button>
              )}
              {(selectedContact.phone || vendorDetails?.formatted_phone_number) && (
                <button
                  type="button"
                  onClick={() => router.push(`/?contactId=${selectedContact.id}`)}
                  className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 focus:outline-none flex-shrink-0"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[100px] md:max-w-[120px]">
                    {selectedContact.phone || vendorDetails?.formatted_phone_number}
                  </span>
                </button>
              )}
              {useMemo(() => {
                // Get the real website (not Google Maps)
                const realWebsite = (() => {
                  if (vendorDetails?.website && !vendorDetails.website.includes('maps.google.com')) {
                    return vendorDetails.website;
                  }
                  if (selectedContact?.website && !selectedContact.website.includes('maps.google.com')) {
                    return selectedContact.website;
                  }
                  return null;
                })();
                
                return realWebsite ? (
                  <a
                    href={realWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 flex-shrink-0"
                  >
                    <span>🌐</span>
                    <span className="truncate max-w-[200px] md:max-w-[300px]">
                      {realWebsite}
                    </span>
                  </a>
                ) : null;
              }, [vendorDetails?.website, selectedContact?.website])}

            </div>
          </div>
          {/* Gmail Re-authentication Banner - Shows when authentication is expired */}
          {showReauthBanner && (
            <div className="mt-0">
              <GmailReauthBanner
                currentUser={currentUser}
                onReauth={() => {
                  setShowReauthNotification(false);
                  setShowReauthBanner(false);
                }}
              />
            </div>
          )}
          
          {/* Gmail Import Banner - Shows when Gmail history is available */}
          {showGmailBanner && !bannerDismissed && !showReauthBanner && (
            <div className="mt-0">
              <Banner
                message={
                  <div className="flex justify-between items-center w-full">
                    <span className="flex items-center">
                      <WandSparkles className="w-5 h-5 text-purple-500 mr-2" />
                      <span>Looks like you've been emailing with this contact! Do you want to import the emails here?</span>
                    </span>
                        <button
                      onClick={handleImportGmail}
                      className="ml-3 text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0] flex items-center gap-1 whitespace-nowrap"
                      style={{ marginRight: 12 }}
                      disabled={checkingGmail}
                        >
                      <FileUp className="w-4 h-4 mr-1" /> Import Emails
                        </button>
                  </div>
                }
                type="feature"
                onDismiss={handleDismissBanner}
              />
            </div>
          )}
                    </>
                  )}
      <div className="flex flex-col flex-1 min-h-0">
        <MessageListArea
          messages={state.messages}
          loading={state.loading}
          isInitialLoad={state.isInitialLoad}
          currentUser={currentUser}
          getRelativeDate={getRelativeDate}
          MessagesSkeleton={MessagesSkeleton}
          messagesEndRef={messagesEndRef}
          handleScroll={handleScroll}
          onReply={setReplyingToMessage}
          onDelete={handleDeleteMessage}
          replyingToMessage={replyingToMessage}
          selectedContact={selectedContact}
          vendorDetails={vendorDetails}
          vendorContactLoading={vendorContactLoading}
          hasContactInfo={hasContactInfo}
          setIsEditing={setIsEditing}
        />
        {useMemo(() => {
          const shouldHideDraftArea = selectedContact?.placeId && hasContactInfo === false;
          devLog('🔍 MessageDraftArea condition check:', {
            selectedContactPlaceId: selectedContact?.placeId,
            hasContactInfo,
            shouldHideDraftArea
          });
          return !shouldHideDraftArea;
        }, [selectedContact?.placeId, hasContactInfo]) && (
          <MessageDraftArea
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
            textareaRef={textareaRef}
            input={input}
            animatedDraft={animatedDraft}
            isAnimating={isAnimating}
            isGenerating={isGenerating}
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            selectedContact={selectedContact}
            selectedFiles={selectedFiles}
            handleRemoveFile={handleRemoveFile}
            handleGenerateDraft={handleGenerateDraft}
            draftLoading={draftLoading}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            emojiPickerRef={emojiPickerRef}
            EmojiPicker={EmojiPicker}
            handleEmojiSelect={handleEmojiSelect}
            isAnimatingOrGenerating={isAnimating || isGenerating}
            handleSendMessage={handleSendMessage}
            replyingToMessage={replyingToMessage}
            clearReply={clearReply}
            subject={subject}
            setSubject={setSubject}
          />
        )}
      </div>
      <LoadingBar 
        isVisible={isSending} 
        description="Sending your message..." 
      />
      <LoadingBar 
        isVisible={isImportingGmail} 
        description="Importing Gmail messages..." 
      />
      <LoadingBar 
        isVisible={isCheckingGmail} 
        description="Checking for new Gmail messages..." 
        onComplete={() => {}} 
      />
      
      {/* Gmail Re-authentication Notification */}
      <GmailReauthNotification
        isVisible={showReauthNotification}
        currentUser={currentUser}
        onReauth={() => {
          setShowReauthNotification(false);
          setShowReauthBanner(false);
        }}
        onDismiss={() => setShowReauthNotification(false)}
      />

      {/* Gmail Import Configuration Modal */}
      {showImportConfigModal && (
        <GmailImportConfigModal
          onClose={() => setShowImportConfigModal(false)}
          onImport={handleConfiguredImportGmail}
          isImporting={isImportingGmail}
        />
      )}
    </div>
  );
};

export default MessageArea;