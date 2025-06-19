// components/MessageArea.tsx
"use client"; // Important for client-side functionality

import React, { useEffect, useRef, useState, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs, limit, doc, setDoc, updateDoc, Timestamp, startAfter, getDocsFromCache, getDoc, writeBatch } from "firebase/firestore";
import { User } from "firebase/auth";
import { Mail, Phone, FileUp, SmilePlus, WandSparkles, MoveRight, File, ArrowLeft, X } from "lucide-react";
import CategoryPill from "./CategoryPill";
import { db, getUserCollectionRef } from "../lib/firebase";
import { useCustomToast } from "../hooks/useCustomToast"; // Make sure this path is correct relative to MessageArea.tsx
import { AnimatePresence, motion } from "framer-motion";
import { Contact } from "../types/contact";
import MessageListArea from './MessageListArea';
import MessageDraftArea from './MessageDraftArea';
import Banner from "./Banner";
import LoadingBar from "./LoadingBar";


// Define interfaces for types needed in this component
interface Message {
  id: string;
  subject: string;
  body: string;
  timestamp: string;
  from: string;
  to: string;
  source: 'gmail' | 'manual';
  isRead: boolean;
  gmailMessageId?: string;
  threadId?: string;
  userId: string;
  attachments?: { name: string }[];
  direction: 'sent' | 'received';
  parentMessageId?: string;
  messageIdHeader?: string;
}

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
}) => {
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
  const clearReply = () => setReplyingToMessage(null);

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
      const messagesRef = collection(db, `artifacts/default-app-id/users/${currentUser.uid}/contacts/${selectedContact.id}/messages`);
      
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
      const messagesRef = collection(db, `artifacts/default-app-id/users/${currentUserId}/contacts/${currentContactId}/messages`);
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
        // Optionally, save the reply to Firestore for local display
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
        if (!data.success) throw new Error(data.error || 'Failed to send Gmail message');
        showSuccessToast('Gmail email sent!');
      }
      // Always save to Firestore for local display
      const path = `artifacts/default-app-id/users/${currentUser.uid}/contacts/${selectedContact.id}/messages`;
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: Message = {
        id: optimisticId,
        subject: replyingToMessage ? replyingToMessage.subject : (subject || input.split('\n')[0] || 'New Message'),
        body: input,
        timestamp: new Date().toLocaleString(),
        from: userEmail,
        to: selectedContact.email || '',
        source: (replyingToMessage && replyingToMessage.source === 'gmail') || selectedChannel === 'Gmail' ? 'gmail' : 'manual',
        isRead: true,
        userId: currentUser.uid,
        ...(replyingToMessage && { parentMessageId: replyingToMessage.id }),
        direction: 'sent',
        ...(selectedFiles.length > 0 && { attachments: selectedFiles.map(f => ({ name: f.name })) }),
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
      let draft = await generateDraft();
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
        // Animate the text with a faster speed
        let currentText = "";
        const chunkSize = 3; // Process multiple characters at once for smoother animation
        for (let i = 0; i < newBody.length; i += chunkSize) {
          await new Promise(resolve => setTimeout(resolve, 10)); // Faster animation
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
    const path = `artifacts/default-app-id/users/${currentUser?.uid}/contacts/${selectedContact?.id}/messages`;
    if (!currentUser?.uid || !selectedContact?.id) return;
    const unsub = onSnapshot(collection(db, path), (snapshot) => {
      console.log('Simple onSnapshot test:', snapshot.docs.map(doc => doc.data()));
    }, (error) => {
      console.error('Simple onSnapshot error:', error);
    });
    return () => unsub();
  }, [currentUser?.uid, selectedContact?.id]);

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
        const contactRef = doc(db, `artifacts/default-app-id/users/${currentUser.uid}/contacts`, selectedContact.id);
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
    if (!currentUser?.uid || !selectedContact?.id) return;
    try {
      setIsImportingGmail(true);
      
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
        collection(db, `artifacts/default-app-id/users/${currentUser.uid}/contacts/${selectedContact.id}/messages`),
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
        body: JSON.stringify({ userId: currentUser.uid, contacts: [selectedContact] }),
      });

      if (!response.ok) {
        throw new Error('Failed to import Gmail conversation');
      }

      // Mark the contact as imported
      const contactRef = doc(db, `artifacts/default-app-id/users/${currentUser.uid}/contacts`, selectedContact.id);
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
      const contactRef = doc(db, `artifacts/default-app-id/users/${currentUser.uid}/contacts`, selectedContact.id);
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

  console.log('UI messages:', state.messages);

  return (
    <div className="flex flex-col h-full">
      {selectedContact && (
        <>
          <div className="bg-[#F3F2F0] w-full p-3 border-b border-[#AB9C95] flex items-center">
            {isMobile && (
              <button
                onClick={() => setActiveMobileTab('contacts')}
                className="mr-2 p-1 rounded-full hover:bg-[#E0DBD7] text-[#332B42]"
                aria-label="Back to contacts"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[16px] font-medium text-[#332B42] leading-tight font-playfair mr-1">
                    {selectedContact.name}
                  </h4>
                  <CategoryPill category={selectedContact.category} />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {selectedContact.email && (
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[100px] md:max-w-none">{selectedContact.email}</span>
                    </a>
                  )}
                  {selectedContact.phone && (
                    <a
                      href={`tel:${selectedContact.phone}`}
                      className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span className="truncate max-w-[100px] md:max-w-none">{selectedContact.phone}</span>
                    </a>
                  )}
                  {selectedContact?.website && (
                    <a
                      href={selectedContact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1"
                    >
                      <span>🌐</span>
                      <span className="truncate max-w-[100px] md:max-w-none">{selectedContact.website}</span>
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showGmailImport && (bannerDismissed || importedOnce) && (
                  <>
                    <button
                      onClick={handleImportGmail}
                      className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0] flex items-center gap-1"
                      disabled={isImportingGmail || isCheckingGmail}
                    >
                      <FileUp className="w-4 h-4 mr-1" />
                      {importedOnce ? 'Re-import Gmail' : 'Import Gmail'}
                    </button>
                    <button
                      onClick={() => handleCheckNewGmail(true)}
                      className="text-xs text-[#A85C36] border border-[#A85C36] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0] flex items-center gap-1"
                      disabled={isImportingGmail || isCheckingGmail}
                      style={{ marginLeft: 8 }}
                    >
                      <WandSparkles className="w-4 h-4 mr-1" />
                      Check for new Gmail messages
                    </button>
                  </>
                )}
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0]"
              >
                Edit
              </button>
            </div>
          </div>
          </div>
          {showGmailBanner && !bannerDismissed && (
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
                      className="ml-3 text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0] flex items-center gap-1"
                      style={{ marginRight: 12 }}
                      disabled={checkingGmail}
                        >
                      <FileUp className="w-4 h-4 mr-1" /> Import Gmail
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
          replyingToMessage={replyingToMessage}
        />
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
    </div>
  );
};

export default MessageArea;