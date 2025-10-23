// components/MessageArea.tsx
"use client"; // Important for client-side functionality

import React, { useEffect, useRef, useState, useReducer, useCallback, useMemo } from "react";

import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from "uuid";
import VendorEmailQueue from '@/utils/vendorEmailQueue';
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs, limit, doc, setDoc, updateDoc, deleteDoc, Timestamp, startAfter, getDocsFromCache, getDoc, writeBatch } from "firebase/firestore";
import { User } from "firebase/auth";
import { Mail, Phone, FileUp, SmilePlus, WandSparkles, MoveRight, File, ArrowLeft, X, MoreHorizontal } from "lucide-react";
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
// GmailReauthBanner now handled globally
import DropdownMenu, { DropdownItem } from './DropdownMenu';
import GmailImportConfigModal, { ImportConfig } from './GmailImportConfigModal';
import GmailTodoReviewModal from './GmailTodoReviewModal';
import { useUserProfileData } from "../hooks/useUserProfileData";
import { useCredits } from "../contexts/CreditContext";
import { useGmailAuth } from "../contexts/GmailAuthContext";
import { dispatchGmailApiError } from '../utils/gmailApiErrorHandler';
import { gmailClientService } from '../utils/gmailClientService';


// Define interfaces for types needed in this component

interface MessageAreaProps {
  selectedContact: Contact | null;
  currentUser: User | null;
  isAuthReady: boolean;
  contacts: Contact[];
  input: string;
  setInput: (input: string) => void;
  draftLoading: boolean;
  generateDraft: (contact?: any, messages?: string[], userId?: string, userData?: any) => Promise<string>;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  contactsLoading: boolean;
  setIsEditing: (isEditing: boolean) => void;
  onContactSelect: (contact: Contact) => void;
  onSetupInbox: () => void;
  userName?: string;
  jiggleEmailField?: boolean;
  setJiggleEmailField?: (jiggle: boolean) => void;
  mobileViewMode?: 'contacts' | 'messages';
  onMobileBackToContacts?: () => void;
}

const getRelativeDate = (dateInput: Date | string | undefined): string => {
    try {
        // Handle undefined or null input
        if (!dateInput) {
            console.warn('No date provided to getRelativeDate:', dateInput);
            return 'Unknown Date';
        }
        
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid date provided to getRelativeDate:', dateInput);
            return 'Unknown Date';
        }
        
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
    } catch (error) {
        console.error('Error in getRelativeDate:', error, 'Input:', dateInput);
        return 'Unknown Date';
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
  mobileViewMode = 'contacts',
  onMobileBackToContacts,
}) => {
  const router = useRouter();
  const { } = useGmailAuth(); // Removed checkGmailAuth - using new error handler system
  const [state, dispatch] = useReducer(messageReducer, { 
    messages: [], 
    loading: false, 
    hasMore: true, 
    lastDoc: null,
    isInitialLoad: true 
  });
  
  // Message state for real-time display
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [selectedChannel, setSelectedChannel] = useState("Gmail");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [animatedDraft, setAnimatedDraft] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const prevContactIdRef = useRef<string | null>(null);
  const prevUserIdRef = useRef<string | null>(null);
  const isGeneratingRef = useRef(false); // Add ref to track generation state
  
  // Cleanup function to reset generation state on unmount
  useEffect(() => {
    return () => {
      isGeneratingRef.current = false;
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileMenu]);

  // messagesEndRef already declared above
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast();
  const { loadCredits, refreshCredits } = useCredits();

  // Get user profile data for AI draft personalization
  const { 
    userName: profileUserName, 
    partnerName, 
    weddingDate, 
    weddingLocation, 
    hasVenue, 
    guestCount, 
    maxBudget, 
    vibe 
  } = useUserProfileData();

  const [pendingDraft, setPendingDraft] = useState<string | null>(null); // For AI draft
  const [showGmailImport, setShowGmailImport] = useState(false);
  const [checkingGmail, setCheckingGmail] = useState(false);
  const [showGmailBanner, setShowGmailBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [importedOnce, setImportedOnce] = useState(false);
  
  // Message state (already declared above)
  
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
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  const vendorDetailsCache = useRef<{[placeId: string]: {data: any; timestamp: number; hasContactInfo: boolean}}>({});
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
  // Gmail reauth banner now handled globally

  const clearReply = () => setReplyingToMessage(null);



  // handleDeleteMessage already declared above

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

  // handleScroll already declared above

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
  
  // Gmail todo review modal state
  const [showGmailTodoReview, setShowGmailTodoReview] = useState(false);
  const [gmailTodoAnalysisResults, setGmailTodoAnalysisResults] = useState<any>(null);
  const [isAnalyzingMessages, setIsAnalyzingMessages] = useState(false);
  
  // Todo suggestions banner state
  const [showTodoSuggestionsBanner, setShowTodoSuggestionsBanner] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<any>(null);

  // Gmail credentials are handled by global banner and API endpoints

  const handleSendMessage = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;
    if (!selectedContact || !currentUser) return;
    const userEmail = currentUser.email;
    if (!userEmail) {
      showErrorToast('User email not found. Please try again.');
      return;
    }

    // Note: Gmail credentials are checked by the global Gmail banner
    // and by the actual Gmail API endpoints when needed

    try {
      setIsSending(true);
      let gmailMessageId: string | undefined;
      let threadId: string | undefined;
      
      // If replying to a Gmail message, send via Gmail API
      if (replyingToMessage && replyingToMessage.source === 'gmail') {
        const attachments = await filesToBase64(selectedFiles);
        
        try {
          // Try client-side Gmail API first (faster and more reliable)
          console.log('🚀 Attempting client-side Gmail reply...');
          const clientResult = await gmailClientService.sendReply(currentUser.uid, {
            to: replyingToMessage.from,
            subject: replyingToMessage.subject,
            body: input,
            threadId: replyingToMessage.threadId,
            messageId: replyingToMessage.messageIdHeader,
            attachments,
          });
          
          if (clientResult.success) {
            console.log('✅ Client-side Gmail reply successful');
            showSuccessToast('Gmail reply sent!');
            gmailMessageId = clientResult.messageId;
            threadId = clientResult.threadId;
          } else {
            throw new Error(clientResult.error || 'Client-side Gmail reply failed');
          }
        } catch (clientError) {
          console.log('⚠️ Client-side Gmail failed, falling back to server route:', clientError);
          
          // Fallback to server route
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
          
          // Check if response is OK and has content before parsing JSON
          if (!res.ok) {
            const text = await res.text();
            console.error('Gmail reply API error:', res.status, text);
            throw new Error(text || `API error: ${res.status}`);
          }
          
          const data = await res.json();
          if (!data.success) {
            if (data.requiresReauth || data.needsReauth) {
              // Dispatch Gmail API error to trigger global auth check
              dispatchGmailApiError({
                status: 401,
                message: data.error || 'Gmail authentication required',
                requiresReauth: true
              });
              showErrorToast('Gmail access expired. Please re-authenticate to send replies.');
              return; // Don't throw error, just return
            }
            
            // Handle Gmail API rate limits gracefully
            if (data.error && data.error.includes('User-rate limit exceeded')) {
              showErrorToast('Gmail rate limit reached. Please wait a moment before sending another email.');
              return; // Don't throw error, just return
            }
            
            // Handle other Gmail API errors
            if (data.error && data.error.includes('Quota exceeded')) {
              showErrorToast('Gmail daily quota exceeded. Please try again tomorrow.');
              return; // Don't throw error, just return
            }
            
            throw new Error(data.error || 'Failed to send Gmail reply');
          }
          showSuccessToast('Gmail reply sent!');
          
          // Extract Gmail message ID from response for local storage
          gmailMessageId = data.gmailRes?.id;
          threadId = data.gmailRes?.threadId;
        }
      }
      // If sending a new Gmail message (not a reply)
      let usedSubject = subject || input.split('\n')[0] || 'New Message';
      
      if (!replyingToMessage && selectedChannel === 'Gmail') {
        const attachments = await filesToBase64(selectedFiles);
        
        try {
          // Try client-side Gmail API first (faster and more reliable)
          console.log('🚀 Attempting client-side Gmail send...');
          const clientResult = await gmailClientService.sendNewMessage(currentUser.uid, {
            to: selectedContact.email,
            subject: usedSubject,
            body: input,
            attachments,
          });
          
          if (clientResult.success) {
            console.log('✅ Client-side Gmail send successful');
            showSuccessToast('Gmail email sent!');
            gmailMessageId = clientResult.messageId;
            threadId = clientResult.threadId;
          } else {
            throw new Error(clientResult.error || 'Client-side Gmail send failed');
          }
        } catch (clientError) {
          console.log('⚠️ Client-side Gmail failed, falling back to server route:', clientError);
          
          // Fallback to server route
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
          
          // Check if response is OK and has content before parsing JSON
          if (!res.ok) {
            const text = await res.text();
            console.error('Gmail send API error:', res.status, text);
            throw new Error(text || `API error: ${res.status}`);
          }
          
          const data = await res.json();
          if (!data.success) {
            if (data.requiresReauth || data.needsReauth) {
              // Dispatch Gmail API error to trigger global auth check
              dispatchGmailApiError({
                status: 401,
                message: data.error || 'Gmail authentication required',
                requiresReauth: true
              });
              showErrorToast('Gmail access expired. Please re-authenticate to send messages.');
              return; // Don't throw error, just return
            }
            
            // Handle Gmail authentication errors
            if (data.requiresReauth || data.needsReauth) {
              // Dispatch Gmail API error to trigger global auth check
              dispatchGmailApiError({
                status: 401,
                message: data.error || 'Gmail authentication required',
                requiresReauth: true
              });
              showErrorToast('Gmail access expired. Please re-authenticate to send replies.');
              return; // Don't throw error, just return
            }
            
            // Handle Gmail API rate limits gracefully
            if (data.error && data.error.includes('User-rate limit exceeded')) {
              showErrorToast('Gmail rate limit reached. Please wait a moment before sending another email.');
              return; // Don't throw error, just return
            }
            
            // Handle other Gmail API errors
            if (data.error && data.error.includes('Quota exceeded')) {
              showErrorToast('Gmail daily quota exceeded. Please try again tomorrow.');
              return; // Don't throw error, just return
            }
            
            throw new Error(data.error || 'Failed to send Gmail message');
          }
          showSuccessToast('Gmail email sent!');
          
          // Extract Gmail message ID from response for local storage
          gmailMessageId = data.gmailRes?.id;
          threadId = data.gmailRes?.threadId;
        }
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


  const handleEmojiSelect = (emoji: string) => {
    setInput(input + emoji);
  };

  const handleGenerateDraft = useCallback(async () => {
    if (!selectedContact || isGeneratingRef.current) {
      return; // Use ref to prevent multiple simultaneous executions
    }
    
    try {
      isGeneratingRef.current = true;
      setIsGenerating(true);
      
      // If replying to a message, generate a contextual response
      let draft;
      if (replyingToMessage) {
        // For replies, we need to call the draft API directly with reply context
        // Use actual user profile data for reply draft personalization
        const userProfileData = {
          userName: profileUserName || userName,
          partnerName,
          weddingDate,
          weddingLocation,
          hasVenue,
          guestCount,
          maxBudget,
          vibe: vibe || []
        };
        
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (currentUser?.uid) {
          headers["x-user-id"] = currentUser.uid;
        }
        
        const res = await fetch("/api/draft", {
          method: "POST",
          headers,
          body: JSON.stringify({ 
            contact: selectedContact, 
            messages: [replyingToMessage.body],
            isReply: true,
            originalSubject: replyingToMessage.subject,
            originalFrom: replyingToMessage.from,
            userData: userProfileData
          }),
        });
        const data = await res.json();
        draft = data.draft || "Failed to generate response";
        
        // Refresh credits after successful reply draft generation (with delay to ensure server commit)
        try {
          // Add a small delay to ensure server-side credit deduction is committed
          await new Promise(resolve => setTimeout(resolve, 500));
          await refreshCredits(); // Don't show loading screen for credit refresh
          
          // Notify other components about credit update
          if (typeof window !== 'undefined') {
            localStorage.setItem('creditUpdateEvent', Date.now().toString());
            // Credit event emission is now handled centrally in CreditProvider
          }
        } catch (error) {
          console.error('[handleGenerateDraft] Failed to refresh credits after reply:', error);
        }
      } else {
        // Generate a new message draft with enhanced context
        // Use actual user profile data for AI draft personalization
        const userProfileData = {
          userName: profileUserName || userName,
          partnerName,
          weddingDate,
          weddingLocation,
          hasVenue,
          guestCount,
          maxBudget,
          vibe: vibe || []
        };
        draft = await generateDraft();
        
        // Refresh credits after successful new draft generation (with delay to ensure server commit)
        try {
          // Add a small delay to ensure server-side credit deduction is committed
          await new Promise(resolve => setTimeout(resolve, 500));
          await refreshCredits(); // Don't show loading screen for credit refresh
          
          // Notify other components about credit update
          if (typeof window !== 'undefined') {
            localStorage.setItem('creditUpdateEvent', Date.now().toString());
            // Credit event emission is now handled centrally in CreditProvider
          }
        } catch (error) {
          console.error('[handleGenerateDraft] Failed to refresh credits after new draft:', error);
        }
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
        
                  // Type out the draft word by word for ultra-fast typing animation
          const words = newBody.split(' ');
          let currentWordIndex = 0;
          const typeInterval = setInterval(() => {
            if (currentWordIndex <= words.length) {
              const currentText = words.slice(0, currentWordIndex).join(' ');
              setAnimatedDraft(currentText + (currentWordIndex < words.length ? ' ' : ''));
              currentWordIndex++;
            } else {
              clearInterval(typeInterval);
              setInput(newBody);
              setIsAnimating(false);
            }
          }, 5); // 5ms per word = ~200 words per second!
      }
    } catch (error) {
      console.error('[handleGenerateDraft] Error generating draft:', error);
      showErrorToast('Failed to generate draft');
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [selectedContact?.id, replyingToMessage?.id, currentUser?.uid, generateDraft, userName, subject]);

  // Removed temporary onSnapshot test to reduce unnecessary Firestore reads

  // Check Gmail authentication status (with caching to prevent excessive API calls)
  const checkGmailAuthStatus = async () => {
    if (!currentUser?.uid) return;
    
    // Add caching to prevent excessive API calls
    const cacheKey = `gmail_auth_${currentUser.uid}`;
    const cached = sessionStorage.getItem(cacheKey);
    const now = Date.now();
    
    if (cached) {
      const { timestamp } = JSON.parse(cached);
      if (now - timestamp < 5 * 60 * 1000) { // 5 minute cache
        return;
      }
    }
    
    try {
      // Use client-side Gmail service instead of server-side API
      const { gmailClientService } = await import('@/utils/gmailClientService');
      const isAvailable = await gmailClientService.isGmailAvailable(currentUser.uid);
      
      if (!isAvailable) {
        console.log('🔐 Gmail not available, triggering banner');
        window.dispatchEvent(new CustomEvent('gmail-auth-required'));
        return;
      }
    } catch (error) {
      console.error('Error checking Gmail auth status:', error);
    } finally {
      // Update cache regardless of success/failure
      sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: now }));
    }
  };

  // Check Gmail authentication status on component mount
  useEffect(() => {
    if (currentUser?.uid) {
      checkGmailAuthStatus();
    }
  }, [currentUser?.uid]);

  // Effect to fetch messages when a contact is selected
  useEffect(() => {
    if (!selectedContact?.id || !currentUser?.uid) {
      console.log('🔍 MessageArea: No contact or user, clearing messages');
      setMessages([]);
      return;
    }

       setMessagesLoading(true);
       setIsInitialLoad(true);

       // Set up real-time listener for messages
       // Use the contact email as the document ID since that's how Gmail import saves messages
       const contactEmail = selectedContact.email;
    const messagesRef = collection(db, `users/${currentUser.uid}/contacts/${contactEmail}/messages`);
    const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(50)); // Limit to 50 messages

         const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
           const fetchedMessages: any[] = [];
           const seenIds = new Set<string>();
           
           snapshot.forEach((doc) => {
             const data = doc.data();
             const messageId = data.id || doc.id; // Use Gmail message ID if available, otherwise Firestore doc ID
             
             // Skip duplicates based on Gmail message ID
             if (seenIds.has(messageId)) {
               return;
             }
             
             seenIds.add(messageId);
             fetchedMessages.push({
               id: doc.id,
               ...data,
               createdAt: data.createdAt?.toDate() || new Date(),
               // Convert Firestore Timestamp to JavaScript Date for the date field
               date: data.date?.toDate ? data.date.toDate() : (data.date instanceof Date ? data.date : new Date(data.date || Date.now())),
             });
           });
           
           setMessages(fetchedMessages);
           setMessagesLoading(false);
           setIsInitialLoad(false);
         }, (error) => {
           console.error('❌ MessageArea: Error fetching messages:', error);
           setMessagesLoading(false);
           setIsInitialLoad(false);
         });

    return () => unsubscribe();
  }, [selectedContact?.id, currentUser?.uid]);

  // Handle scroll to bottom
  const handleScroll = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Handle message deletion
  const handleDeleteMessage = useCallback(async (message: any) => {
    if (!selectedContact?.email || !currentUser?.uid) return;
    
    try {
      const messageRef = doc(db, `users/${currentUser.uid}/contacts/${selectedContact.email}/messages`, message.id);
      await deleteDoc(messageRef);
      showSuccessToast('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      showErrorToast('Failed to delete message');
    }
  }, [selectedContact?.email, currentUser?.uid, showSuccessToast, showErrorToast]);

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
        // Use client-side Gmail service to check history
        console.log('🔍 Checking Gmail history for contact:', selectedContact.email);
        const historyResult = await gmailClientService.checkGmailHistory(selectedContact.email, currentUser.uid);
        
        if (historyResult.error) {
          console.log('❌ Gmail history check failed:', historyResult.error);
          // Don't show import button if there's an error
          return;
        }
        
        const data = { hasHistory: historyResult.hasHistory };
        
        // Check if this contact has been imported before
        const contactRef = doc(db, `users/${currentUser.uid}/contacts`, selectedContact.id);
        const contactSnap = await getDoc(contactRef);
        const contactData = contactSnap.data();
        const hasBeenImported = contactData?.gmailImported || false;
        const hasDismissedBanner = contactData?.gmailBannerDismissed || false;
        
        let showImport = false;
        let showBanner = false;
        let imported = hasBeenImported; // Set imported to true if contact was previously imported
        let dismissed = hasDismissedBanner;
        if (data.hasHistory) {
          showImport = true;
          if (!hasBeenImported && !hasDismissedBanner) {
            showBanner = true;
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
        // Silently handle Gmail API errors - they're not critical for todo functionality
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
        try {
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
          } else {
            console.warn('Gmail account mismatch check failed, proceeding with import');
          }
        } catch (error) {
          console.warn('Gmail account mismatch check error, proceeding with import:', error);
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
      console.log('🚀 Starting Gmail import for:', {
        userId: currentUser.uid,
        contactEmail: selectedContact.email,
        contactName: selectedContact.name,
        config: config
      });

      // Use client-side Gmail import service
      console.log('🚀 Starting client-side Gmail import for:', {
        userId: currentUser.uid,
        contactEmail: selectedContact.email,
        contactName: selectedContact.name,
        config: config
      });

      const importResult = await gmailClientService.importGmailMessages(
        selectedContact.email,
        currentUser.uid,
        {
          maxResults: config.maxResults || 15,
          enableTodoScanning: config.enableTodoScanning || true
        }
      );

      if (!importResult.success) {
        throw new Error(importResult.error || 'Failed to import Gmail messages');
      }

      const result = {
        success: true,
        totalImportedMessages: importResult.totalImportedMessages || 0
      };

      console.log('✅ Gmail import result:', result);
      
      // Mark the contact as imported
      const contactRef = doc(db, `users/${currentUser.uid}/contacts`, selectedContact.id);
      const updateData: any = {
        gmailImported: true,
        lastImportDate: new Date().toISOString(),
      };
      
      // Only add lastGmailAccount if it's defined
      if (currentGmailAccount) {
        updateData.lastGmailAccount = currentGmailAccount;
      }
      
      await updateDoc(contactRef, updateData);

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

      // Todo analysis now runs in background - no immediate modal needed
      console.log('✅ Gmail import completed successfully');
      console.log('🔄 Todo analysis running in background...');
      
      // Show success message instead of analysis modal
      showSuccessToast(`Successfully imported ${result.totalImportedMessages || 0} messages! Todo analysis running in background.`);
    } catch (error) {
      console.error('Error importing Gmail:', error);
      
      // Check if this is a Gmail authentication error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Gmail access token expired') || 
          errorMessage.includes('Please re-authorize Gmail access') ||
          errorMessage.includes('invalid_grant') || 
          errorMessage.includes('invalid_token')) {
        // Trigger the Gmail auth banner manually from client-side
        console.log('🚨 Gmail auth error detected, triggering banner...');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gmail-auth-required', {
            detail: { timestamp: Date.now(), source: 'gmail-import-failure' }
          }));
        }
        showErrorToast('Gmail access expired. Please re-authenticate to import messages.');
      } else {
        showErrorToast('Failed to import Gmail messages');
      }
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
  
  // Handle reviewing todo suggestions from stored data
  const handleReviewTodoSuggestions = () => {
    if (!pendingSuggestions) return;
    
    // Open the todo review modal with the stored suggestions
    setGmailTodoAnalysisResults({
      newTodos: pendingSuggestions.suggestions || [],
      todoUpdates: pendingSuggestions.todoUpdates || [],
      completedTodos: pendingSuggestions.completedTodos || [],
      messagesAnalyzed: pendingSuggestions.suggestions?.length || 0
    });
    setShowGmailTodoReview(true);
    setShowTodoSuggestionsBanner(false);
  };
  
  // Handle dismissing todo suggestions
  const handleDismissTodoSuggestions = async () => {
    if (!currentUser?.uid || !selectedContact?.id) return;
    
    try {
      const contactRef = doc(db, `users/${currentUser.uid}/contacts`, selectedContact.id);
      await updateDoc(contactRef, {
        'pendingTodoSuggestions.status': 'dismissed'
      });
      setShowTodoSuggestionsBanner(false);
      setPendingSuggestions(null);
    } catch (error) {
      console.error('Error dismissing todo suggestions:', error);
    }
  };

  const createSuggestedTodo = async (todoData: any, message: any, userId: string) => {
    try {
      const todoRef = await addDoc(collection(db, `users/${userId}/todos`), {
        name: todoData.name,
        description: todoData.description || '',
        priority: todoData.priority || 'medium',
        category: todoData.category || 'other',
        dueDate: todoData.dueDate || null,
        estimatedTime: todoData.estimatedTime || null,
        notes: todoData.notes || '',
        isCompleted: false,
        createdAt: Timestamp.now(),
        source: 'gmail_analysis',
        sourceMessageId: message.id,
        sourceContact: message.sourceContact || 'unknown'
      });
      return todoRef.id;
    } catch (error) {
      console.error('Error creating suggested todo:', error);
      throw error;
    }
  };

  const updateExistingTodo = async (update: any, userId: string) => {
    try {
      const updateData: any = {};
      
      if (update.updates.note) updateData.note = update.updates.note;
      if (update.updates.deadline) updateData.deadline = update.updates.deadline;
      if (update.updates.category) updateData.category = update.updates.category;
      if (update.updates.isCompleted !== undefined) updateData.isCompleted = update.updates.isCompleted;
      
      updateData.updatedAt = Timestamp.now();

      await updateDoc(doc(db, `users/${userId}/todos`, update.todoId), updateData);
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  };

  const markTodoCompleted = async (completed: any, userId: string) => {
    try {
      await updateDoc(doc(db, `users/${userId}/todos`, completed.todoId), {
        isCompleted: true,
        completedAt: Timestamp.now(),
        completionReason: completed.completionReason
      });
    } catch (error) {
      console.error('Error marking todo as completed:', error);
      throw error;
    }
  };


  const handleGmailTodoConfirm = async (selectedTodos: any) => {
    if (!currentUser?.uid) return;
    
    try {
      // Create the selected todos
      for (const todo of selectedTodos.newTodos) {
        await createSuggestedTodo(todo, { id: 'gmail-import', sourceContact: todo.sourceContact }, currentUser.uid);
      }
      
      // Update existing todos
      for (const update of selectedTodos.todoUpdates) {
        await updateExistingTodo(update, currentUser.uid);
      }
      
      // Mark todos as completed
      for (const completed of selectedTodos.completedTodos) {
        await markTodoCompleted(completed, currentUser.uid);
      }
      
      showSuccessToast(`Applied ${selectedTodos.newTodos.length + selectedTodos.todoUpdates.length + selectedTodos.completedTodos.length} todo changes!`);
      
      // Clear pending suggestions from contact document after user reviews
      if (selectedContact?.id) {
        const contactRef = doc(db, `users/${currentUser.uid}/contacts`, selectedContact.id);
        await updateDoc(contactRef, {
          'pendingTodoSuggestions.status': 'reviewed',
          'pendingTodoSuggestions.reviewedAt': new Date()
        });
      }
      
    } catch (error) {
      console.error('Error applying todo changes:', error);
      showErrorToast('Failed to apply some todo changes');
    } finally {
      setShowGmailTodoReview(false);
      setGmailTodoAnalysisResults(null);
      setPendingSuggestions(null);
    }
  };

  // For button-triggered check
  const handleCheckNewGmail = async (userInitiated = false) => {
    if (!currentUser?.uid || !selectedContact?.email) return;
    try {
      if (userInitiated) setIsCheckingGmail(true);
      
      // Use client-side Gmail import service for new messages
      const importResult = await gmailClientService.importGmailMessages(
        selectedContact.email,
        currentUser.uid,
        {
          maxResults: 5, // Limit for new message checks
          enableTodoScanning: true
        }
      );

      if (!importResult.success) {
        throw new Error(importResult.error || 'Failed to check for new Gmail messages');
      }

      const data = {
        newMessages: (importResult.totalImportedMessages || 0) > 0 ? [{ id: 'new' }] : [],
        totalImportedMessages: importResult.totalImportedMessages || 0,
        todoAnalysis: null,
        todoSuggestionsStored: false,
        suggestionsCount: 0
      };
      
      // Handle user-initiated checks (show modal immediately)
      if (userInitiated) {
        if (data.newMessages && data.newMessages.length > 0) {
          showSuccessToast(`${data.newMessages.length} new Gmail message(s) imported!`);
        } else {
          showInfoToast('No new Gmail messages found.');
        }
        
        // If todo scanning returned results, show modal immediately
        if (data.todoAnalysis && data.todoAnalysis.analysisResults) {
          setGmailTodoAnalysisResults(data.todoAnalysis.analysisResults);
          setShowGmailTodoReview(true);
        }
      } else {
        // Background check - suggestions are stored, badge will appear automatically
        console.log('[AUTO-CHECK] Background check complete:', data.todoSuggestionsStored ? `${data.suggestionsCount} suggestions stored` : 'no suggestions');
      }
    } catch (error) {
      console.error('Error checking for new Gmail messages:', error);
      
      if (userInitiated) {
        // Check if this is a Gmail authentication error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Gmail access token expired') || 
            errorMessage.includes('Please re-authorize Gmail access') ||
            errorMessage.includes('invalid_grant') || 
            errorMessage.includes('invalid_token')) {
          // The API endpoint should have already triggered the global banner via error handler
          // No need to call checkGmailAuth here as it conflicts with our new system
          showErrorToast('Gmail access expired. Please re-authenticate to check for new messages.');
        } else {
          showErrorToast('Failed to check for new Gmail messages');
        }
      }
    } finally {
      if (userInitiated) setIsCheckingGmail(false);
    }
  };

  // Check for pending todo suggestions when contact changes
  useEffect(() => {
    if (!currentUser?.uid || !selectedContact?.id) {
      setShowTodoSuggestionsBanner(false);
      setPendingSuggestions(null);
      return;
    }

    // Set up real-time listener for contact document changes
    const contactRef = doc(db, `users/${currentUser.uid}/contacts`, selectedContact.id);
    const unsubscribe = onSnapshot(contactRef, (contactSnap) => {
      if (contactSnap.exists()) {
        const contactData = contactSnap.data();
        const suggestions = contactData?.pendingTodoSuggestions;
        
        if (suggestions && suggestions.status === 'pending' && suggestions.count > 0) {
          setPendingSuggestions(suggestions);
          setShowTodoSuggestionsBanner(true);
        } else {
          setShowTodoSuggestionsBanner(false);
          setPendingSuggestions(null);
        }
      } else {
        setShowTodoSuggestionsBanner(false);
        setPendingSuggestions(null);
      }
    }, (error) => {
      console.error('Error listening to contact document:', error);
    });

    return () => unsubscribe();
  }, [selectedContact?.id, currentUser?.uid]);

  useEffect(() => {
    if (showGmailImport && importedOnce && selectedContact && currentUser) {
      handleCheckNewGmail(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact?.id]);

  // Optimized vendor contact information fetching with better caching
  const fetchVendorContactInfo = useCallback(async () => {
    logger.perf('Checking vendor contact info', { 
      name: selectedContact?.name, 
      placeId: selectedContact?.placeId,
      hasEmail: !!selectedContact?.email,
      hasPhone: !!selectedContact?.phone
    });
    
    if (!selectedContact?.placeId) {
      setHasContactInfo(null);
      // Only clear vendor details if we're switching to a different contact
      if (currentPlaceIdRef.current && currentPlaceIdRef.current !== selectedContact?.placeId) {
        setVendorDetails(null);
        currentPlaceIdRef.current = null;
      }
      return;
    }

    // Check if we're switching to a different placeId
    if (currentPlaceIdRef.current && currentPlaceIdRef.current !== selectedContact.placeId) {
      setVendorDetails(null);
    }
    
    currentPlaceIdRef.current = selectedContact.placeId;

    // Check cache first with timestamp validation
    const cached = vendorDetailsCache.current[selectedContact.placeId];
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      logger.perf('Using cached vendor details', selectedContact.placeId);
      setVendorDetails(cached.data);
      setHasContactInfo(cached.hasContactInfo);
      return;
    }

    // Don't refetch if we already have vendor details for this placeId
    if (vendorDetails?.place_id === selectedContact.placeId) {
      return;
    }

    setVendorContactLoading(true);
    try {
      // Fetch vendor details using client-side Google Places API
      const { googlePlacesClientService } = await import('@/utils/googlePlacesClientService');
      const detailsResult = await googlePlacesClientService.getPlaceDetails(selectedContact.placeId);
      
      if (!detailsResult.success) {
        console.error('Failed to fetch vendor details:', detailsResult.error);
        setHasContactInfo(false);
        return;
      }
      
      const data = { status: 'OK', result: detailsResult.place };
      
      if (data.status === 'OK' && data.result) {
        // Cache the vendor details with timestamp and contact info
        const hasGooglePhone = data.result.formatted_phone_number;
        const hasGoogleWebsite = data.result.website;
        const hasContactEmail = selectedContact.email;
        const hasContactPhone = selectedContact.phone;
        
        // For messaging purposes, we need either an email address or a phone number
        const hasMessagingContactInfo = !!(hasContactEmail || hasContactPhone || hasGooglePhone);
        
        // Check for verified emails from our system (only if no direct contact info)
        let hasVerifiedEmails = false;
        if (!hasMessagingContactInfo) {
          try {
            const queue = VendorEmailQueue.getInstance();
            const verifiedEmailsData = await queue.queueRequest(selectedContact.placeId);
            hasVerifiedEmails = verifiedEmailsData.emails && 
                               verifiedEmailsData.emails.length > 0 && 
                               verifiedEmailsData.emails.some((email: any) => email.email && email.email.trim() !== '');
          } catch (error) {
            logger.error('Error fetching verified emails', error);
          }
        }
        
        const finalHasContactInfo = hasMessagingContactInfo || hasVerifiedEmails;
        
        // Update cache with timestamp and contact info
        vendorDetailsCache.current[selectedContact.placeId] = {
          data: data.result,
          timestamp: Date.now(),
          hasContactInfo: finalHasContactInfo
        };
        
        setVendorDetails(data.result);
        setHasContactInfo(finalHasContactInfo);
      } else {
        setHasContactInfo(false);
      }
    } catch (error) {
      logger.error('Error fetching vendor contact info', error);
      setHasContactInfo(false);
    } finally {
      setVendorContactLoading(false);
    }
  }, [selectedContact?.placeId, selectedContact?.email, selectedContact?.phone]);

  // Effect to fetch vendor details when a vendor contact is selected
  useEffect(() => {
    if (selectedContact?.placeId) {
      fetchVendorContactInfo();
    }
  }, [selectedContact?.placeId, selectedContact?.email, selectedContact?.phone]); // Remove fetchVendorContactInfo dependency


  // Optimized debug effect - only log in development and reduce frequency
  useEffect(() => {
    if (selectedContact?.placeId) {
      logger.perf('Vendor details updated', {
        placeId: vendorDetails?.place_id,
        hasWebsite: !!vendorDetails?.website,
        hasPhone: !!vendorDetails?.formatted_phone_number,
        contactName: selectedContact?.name
      });
    }
  }, [vendorDetails?.place_id, selectedContact?.id]);

  return (
    <div className="flex flex-col h-full">
      {selectedContact && (
        <>
          <div className="bg-[#F3F2F0] w-full p-3 border-b border-[#AB9C95] flex flex-col relative overflow-visible">
            {/* Top row: Back button (mobile) and name/category */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {/* Mobile back button */}
                {mobileViewMode === 'messages' && onMobileBackToContacts && (
                  <button
                    onClick={onMobileBackToContacts}
                    className="lg:hidden p-1 rounded-full hover:bg-[#E0DBD7] text-[#332B42]"
                    aria-label="Back to contacts"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <h4 className="text-[16px] font-medium text-[#332B42] leading-none font-playfair truncate">
                    {selectedContact.name}
                  </h4>
                  {vendorDetails?.name && (
                    <>
                      <span className="text-[#AB9C95] text-[12px] flex-shrink-0">•</span>
                      <span className="text-[12px] text-[#364257] truncate max-w-[150px] lg:max-w-[250px] leading-none">
                        {vendorDetails.name}
                      </span>
                    </>
                  )}
                </div>
                {/* Desktop: Show category pill next to name */}
                <div className="hidden lg:block">
                  <CategoryPill category={selectedContact.category} />
                </div>
              </div>
              
              {/* Actions on the right */}
              <div className="flex items-center gap-2 flex-nowrap">
                {/* Desktop: Show Gmail Actions and Edit button */}
                <div className="hidden lg:flex items-center gap-2">
                  {(showGmailImport || importedOnce) && selectedContact?.email && (
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

                {/* Mobile: Show three dot menu */}
                <div className="lg:hidden relative" ref={mobileMenuRef}>
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                    title="More options"
                  >
                    <MoreHorizontal size={16} className="text-gray-500" />
                  </button>
                  {showMobileMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMobileMenu(false);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      {(showGmailImport || importedOnce) && selectedContact?.email && (
                        <>
                          <button
                            onClick={() => {
                              handleCheckNewGmail(true);
                              setShowMobileMenu(false);
                            }}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                          >
                            <WandSparkles className="w-4 h-4 mr-2" />
                            Check for New Emails
                          </button>
                          <button
                            onClick={() => {
                              handleImportGmail();
                              setShowMobileMenu(false);
                            }}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                          >
                            <FileUp className="w-4 h-4 mr-2" />
                            {importedOnce ? 'Re-Import Emails' : 'Import Emails'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Bottom row: Contact metadata */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Desktop: Show full text with icons */}
              <div className="hidden lg:flex items-center gap-2 flex-wrap">
              
              {selectedContact.email ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
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
                  onClick={() => setIsEditing(true)}
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
                      className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 flex-shrink-0 no-underline"
                    >
                      <span>🌐</span>
                      <span className="truncate max-w-[200px] md:max-w-[300px]">
                        {realWebsite}
                      </span>
                    </a>
                  ) : null;
              }, [vendorDetails?.website, selectedContact?.website])}
              </div>

              {/* Mobile: Show just icons with tooltips */}
              <div className="lg:hidden flex items-center gap-2">
                {/* Category pill - first item on mobile */}
                <CategoryPill category={selectedContact.category} />
                {selectedContact.email ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    title={selectedContact.email}
                  >
                    <Mail className="w-3.5 h-3.5 text-[#364257]" />
                  </button>
                ) : (selectedContact.phone || vendorDetails?.formatted_phone_number) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setJiggleEmailField?.(true);
                      setTimeout(() => setJiggleEmailField?.(false), 1000);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    title="Add email address"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#AB9C95]" />
                  </button>
                )}
                {(selectedContact.phone || vendorDetails?.formatted_phone_number) && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    title={selectedContact.phone || vendorDetails?.formatted_phone_number}
                  >
                    <Phone className="w-3.5 h-3.5 text-[#364257]" />
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
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors no-underline"
                      title={realWebsite.replace(/^https?:\/\//, '')}
                    >
                      <span className="text-base">🌐</span>
                    </a>
                  ) : null;
                }, [selectedContact?.website, vendorDetails?.website])}
              </div>
            </div>
          </div>
          {/* Gmail Re-authentication Banner - Removed, now handled globally */}
          
          {/* Gmail Import Banner - Shows when Gmail history is available */}
          {showGmailBanner && !bannerDismissed && (
            <div className="mt-0">
              <Banner
                message={
                  <>
                    {/* Mobile Layout */}
                    <div className="lg:hidden">
                      <div className="flex items-start gap-3">
                        <WandSparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm leading-relaxed">
                            Looks like you've been emailing with this contact! Do you want to import the emails here?
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleImportGmail}
                          className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0] flex items-center gap-1 whitespace-nowrap"
                          disabled={checkingGmail}
                        >
                          <FileUp className="w-4 h-4 mr-1" /> Import Emails
                        </button>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden lg:flex justify-between items-center w-full">
                      <span className="flex items-center">
                        <WandSparkles className="w-4 h-4 text-purple-500 mr-2" />
                        <span>Looks like you've been emailing with this contact! Do you want to import the emails here?</span>
                      </span>
                      <button
                        onClick={handleImportGmail}
                        className="ml-3 text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0] flex items-center gap-1 whitespace-nowrap"
                        disabled={checkingGmail}
                      >
                        <FileUp className="w-4 h-4 mr-1" /> Import Emails
                      </button>
                    </div>
                  </>
                }
                type="info"
                onDismiss={handleDismissBanner}
              />
            </div>
          )}
          
          {/* Todo Suggestions Banner - Shows when AI found action items in recent emails */}
          {showTodoSuggestionsBanner && pendingSuggestions && (
            <div className="mt-0">
              <div 
                className="px-4 py-3 border flex items-start gap-3"
                style={{ 
                  backgroundColor: '#f8f5ff',
                  borderColor: '#805d93'
                }}
              >
                <WandSparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#805d93' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#332B42] mb-1">
                    Paige analyzed {pendingSuggestions.suggestions?.length || 0} recent email{(pendingSuggestions.suggestions?.length || 0) !== 1 ? 's' : ''} and found {pendingSuggestions.count} action item{pendingSuggestions.count !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-[#5A4A42]">
                    Review these suggestions and add them to your to-do lists with one click.
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={handleReviewTodoSuggestions}
                    className="px-3 py-1.5 rounded text-xs font-medium text-white transition-colors"
                    style={{ backgroundColor: '#805d93' }}
                  >
                    Review & Add
                  </button>
                  <button
                    onClick={handleDismissTodoSuggestions}
                    className="px-3 py-1.5 rounded text-xs font-medium border border-[#AB9C95] text-[#332B42] hover:bg-gray-50 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
                    </>
                  )}
      <div className="flex flex-col flex-1 min-h-0">
        <MessageListArea
          messages={messages}
          loading={messagesLoading}
          isInitialLoad={isInitialLoad}
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
          logger.debug('MessageDraftArea condition check:', {
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
        description="Sending your message!\nPlease don't refresh" 
      />
      <LoadingBar 
        isVisible={isImportingGmail} 
        description="Analyzing emails to create/update to-dos! Please do not refresh" 
      />
      <LoadingBar 
        isVisible={isCheckingGmail} 
        description="Checking for new Gmail messages!\nPlease don't refresh" 
        onComplete={() => {}} 
      />
      
      {/* Gmail Re-authentication Notification */}
      <GmailReauthNotification
        isVisible={showReauthNotification}
        currentUser={currentUser}
        onReauth={() => {
          setShowReauthNotification(false);
          // Gmail reauth banner now handled globally
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

        {/* Gmail Todo Review Modal */}
        <GmailTodoReviewModal
          isOpen={showGmailTodoReview}
          onClose={() => setShowGmailTodoReview(false)}
          onConfirm={handleGmailTodoConfirm}
          analysisResults={gmailTodoAnalysisResults}
          isAnalyzing={isAnalyzingMessages}
        />

    </div>
  );
};

export default MessageArea;