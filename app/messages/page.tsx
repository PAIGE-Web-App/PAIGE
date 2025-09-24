// app/messages/page.tsx
"use client";
import { getAuth, onAuthStateChanged, User, signInWithCustomToken, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, addDoc, writeBatch, Timestamp, collection, query, where, orderBy, onSnapshot, limit, getDocs } from "firebase/firestore";
import Fuse from "fuse.js";
import { useEffect, useRef, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { v4 as uuidv4 } from "uuid";
import { saveContactToFirestore } from "../../lib/saveContactToFirestore";
import { useDraftMessage } from "../../hooks/useDraftMessage";
import { getCategoryStyle } from "../../utils/categoryStyle";
import { db, getUserCollectionRef } from "../../lib/firebase";
import { useCustomToast } from "@/hooks/useCustomToast";
import { useGlobalCompletionToasts } from "@/hooks/useGlobalCompletionToasts";
import { useQuickStartCompletion } from "@/hooks/useQuickStartCompletion";

// Lazy load heavy components for better initial bundle size
const MessageArea = lazy(() => import("../../components/MessageArea"));
const AddContactModal = lazy(() => import("../../components/AddContactModal"));
const EditContactModal = lazy(() => import("../../components/EditContactModal"));
const OnboardingModal = lazy(() => import("../../components/OnboardingModal"));
const RightDashboardPanel = lazy(() => import("../../components/RightDashboardPanel"));
const NotEnoughCreditsModal = lazy(() => import("../../components/NotEnoughCreditsModal"));
const TodoTemplatesModal = lazy(() => import("../../components/TodoTemplatesModal"));
import { Mail, Phone, Filter, X, FileUp, SmilePlus, WandSparkles, MoveRight, File, ArrowLeft, CheckCircle, Circle, MoreHorizontal, MessageSquare, Heart, ClipboardList, Users } from "lucide-react";
import CategoryPill from "../../components/CategoryPill";
import SelectField from "../../components/SelectField";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import Banner from "../../components/Banner";
import WeddingBanner from "../../components/WeddingBanner";
import GmailReauthBanner from "../../components/GmailReauthBanner";
import LoadingSpinner from "../../components/LoadingSpinner";
import type { TodoItem } from '../../types/todo';
import { COUPLE_SUBSCRIPTION_CREDITS } from "../../types/credits";
import { useCredits } from "../../contexts/CreditContext";

// Component that uses credits for the modal
function NotEnoughCreditsModalWrapper({ 
  isOpen, 
  onClose, 
  requiredCredits, 
  feature, 
  accountInfo 
}: {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
  feature: string;
  accountInfo: any;
}) {
  const { credits } = useCredits();
  
  return (
    <NotEnoughCreditsModal
      isOpen={isOpen}
      onClose={onClose}
      requiredCredits={requiredCredits}
      currentCredits={credits ? (credits.dailyCredits + credits.bonusCredits) : 0}
      feature={feature}
      accountInfo={accountInfo}
    />
  );
}

import { Contact } from "../../types/contact";
import { SimpleMessage } from "../../types/message";
import ContactsList from '../../components/ContactsList';
import MessagesPanel from '../../components/MessagesPanel';
import { handleLogout } from '../../utils/logout';

// Declare global variables provided by the Canvas environment
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;

// Using SimpleMessage from shared types

interface RightDashboardPanelProps {
  currentUser: User;
  contacts: Contact[];
  rightPanelSelection: string | null;
  setRightPanelSelection: (selection: string | null) => void;
}

import { getRelativeDate } from '@/utils/dateUtils';

import EmojiPicker from '@/components/EmojiPicker';


// Import standardized skeleton components
import ContactsListSkeleton from '../../components/skeletons/ContactsListSkeleton';
import MessagesSkeleton from '../../components/skeletons/MessagesSkeleton';

import { removeUndefinedFields } from '@/utils/arrayUtils';
import { parseLocalDateTime } from '@/utils/dateUtils';

// Add triggerGmailImport function
const triggerGmailImport = async (userId: string, contacts: Contact[]) => {
  try {
    const response = await fetch('/api/start-gmail-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        contacts,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to start Gmail import');
    }

    // Gmail import started successfully - no need to log in production
    return data;
  } catch (error) {
    console.error('Error starting Gmail import:', error);
    throw error;
  }
};

export default function MessagesPage() {
  const { user, userName, loading: authLoading, onboardingStatus, checkOnboardingStatus } = useAuth();
  const router = useRouter();
  
  // Track Quick Start Guide completion
  useQuickStartCompletion();
  
  // Core state - frequently updated
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // UI state - less frequently updated
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [jiggleEmailField, setJiggleEmailField] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [lastOnboardedContacts, setLastOnboardedContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialContactLoadComplete, setInitialContactLoadComplete] = useState(false);
  const [minLoadTimeReached, setMinLoadTimeReached] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('name-asc');
  const [contactLastMessageMap, setContactLastMessageMap] = useState<Map<string, Date>>(new Map());
  const [showFilters, setShowFilters] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [bottomNavHeight, setBottomNavHeight] = useState(0);
  const [onboardingCheckLoading, setOnboardingCheckLoading] = useState(false);
  
  // Refs for DOM elements
  const filterPopoverRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  
  // Hooks
  const { draft, loading: draftLoading, generateDraft: generateDraftMessage } = useDraftMessage();
  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use centralized WeddingBanner hook
  
  // Use notifications hook for unread message counts
  const { contactUnreadCounts } = useNotifications();

  // Check Gmail authentication status globally
  const checkGmailAuthStatus = async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch('/api/check-gmail-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, contactEmail: 'test@example.com' }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (data.message?.includes('Google authentication required') || 
            data.message?.includes('Failed to refresh Google authentication') ||
            data.message?.includes('Google authentication expired')) {
          setShowGmailReauthBanner(true);
        }
      }
    } catch (error) {
      console.error('Error checking Gmail auth status:', error);
    }
  };

  // Optimized Fuse search initialization with memoization
  const fuse = useMemo(() => {
    if (contacts.length === 0) return null;
    
    return new Fuse(contacts, {
      keys: ["name"],
      threshold: 0.4,
      ignoreLocation: true,
      isCaseSensitive: false,
    });
  }, [contacts]);

  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState("Gmail");
  const [contactsLoading, setContactsLoading] = useState(true);

  const [rightPanelSelection, setRightPanelSelection] = useState<"todo" | "messages" | "favorites">("todo");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [mobileViewMode, setMobileViewMode] = useState<'contacts' | 'messages'>('contacts');

  const [userData, setUserData] = useState<any>(null);

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Gmail authentication state
  const [showGmailReauthBanner, setShowGmailReauthBanner] = useState(false);
  
  // Not enough credits modal state
  const [showNotEnoughCreditsModal, setShowNotEnoughCreditsModal] = useState(false);
  const [creditModalData, setCreditModalData] = useState({
    requiredCredits: 1,
    currentCredits: 0,
    feature: 'draft messaging'
  });
  
  // User credits info
  const userCredits = COUPLE_SUBSCRIPTION_CREDITS.free;
  
  // Wrapper function to handle credit errors for draft messaging
  const handleGenerateDraftMessage = async (contact: { name: string; category: string }, messages: string[] = [], userId?: string, userData?: any) => {
    return generateDraftMessage(contact, messages, userId, userData, (error) => {
      // Handle credit error by showing the modal
      setCreditModalData({
        requiredCredits: 1, // Draft messaging costs 1 credit
        currentCredits: 0,
        feature: 'draft messaging'
      });
      setShowNotEnoughCreditsModal(true);
    });
  };

  // Effect to handle progressive loading
  useEffect(() => {
    if (initialContactLoadComplete && minLoadTimeReached) {
      // First load contacts
      setContactsLoading(false);
      
      // Then load messages after a short delay
      setTimeout(() => {
        setMessagesLoading(false);
        setInitialLoadComplete(true);
      }, 300);
    }
  }, [initialContactLoadComplete, minLoadTimeReached]);

  // Effect to finalize contactsLoading state - simplified to prevent race conditions
  useEffect(() => {
    if (initialContactLoadComplete) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setContactsLoading(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [initialContactLoadComplete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadTimeReached(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Event listener for opening todo templates modal
  useEffect(() => {
    const handleOpenTemplatesModal = () => {
      setShowTemplatesModal(true);
    };

    window.addEventListener('openTodoTemplatesModal', handleOpenTemplatesModal);
    
    return () => {
      window.removeEventListener('openTodoTemplatesModal', handleOpenTemplatesModal);
    };
  }, []);

  // Check Gmail authentication status when user is available
  useEffect(() => {
    if (user?.uid && !authLoading) {
      checkGmailAuthStatus();
      
      // Set up periodic check every 5 minutes
      const interval = setInterval(() => {
        checkGmailAuthStatus();
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [user?.uid, authLoading]);

  // Removed problematic effect that was causing redirect loops
  // Authentication is now handled by middleware and AuthContext

  // Use cached onboarding status from AuthContext
  useEffect(() => {
    if (!authLoading && user) {
      if (onboardingStatus === 'unknown') {
        // Only check if status is unknown (first time or cache cleared)
        setOnboardingCheckLoading(true);
        checkOnboardingStatus().then(() => {
          setOnboardingCheckLoading(false);
        });
      } else if (onboardingStatus === 'not-onboarded') {
        // User is not onboarded, redirect to onboarding
        // User is not onboarded, redirecting to onboarding
        router.push('/signup?onboarding=1');
      } else {
        // User is onboarded, no loading needed
        setOnboardingCheckLoading(false);
      }
    } else if (!authLoading && !user) {
      setOnboardingCheckLoading(false);
    }
  }, [user, authLoading, onboardingStatus, checkOnboardingStatus, router]);

  // Function to handle user logout
  const handleLogoutClick = async () => {
    await handleLogout(router);
  };

   // Optimized Contacts Listener with proper cleanup
  useEffect(() => {
    let isSubscribed = true;
    let unsubscribeContacts: () => void;
    
    if (user && user.uid) {
      setContactsLoading(true);
      const userId = user.uid;

      const contactsCollectionRef = getUserCollectionRef<Contact>("contacts", userId);

      const q = query(
        contactsCollectionRef,
        limit(100) // Limit initial load for better performance
      );

      unsubscribeContacts = onSnapshot(q, (snapshot) => {
        if (!isSubscribed) return; // Prevent state updates on unmounted component
        
        
        const fetchedContacts: Contact[] = snapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            category: data.category,
            website: data.website,
            avatarColor: data.avatarColor,
            userId: data.userId,
            orderIndex: data.orderIndex !== undefined ? data.orderIndex : index,
            isOfficial: data.isOfficial || false,
            // Add vendor association fields
            placeId: data.placeId || null,
            isVendorContact: data.isVendorContact || false,
            vendorEmails: data.vendorEmails || [],
          };
        });
        
        if (isSubscribed) {
          setContacts(fetchedContacts);
          
          // Only change selectedContact if we don't have one or if the current one is invalid
          if (!selectedContact) {
            // First time loading - try to restore from localStorage or default to first
            const savedContactId = localStorage.getItem('selectedContactId');
            if (savedContactId) {
              const savedContact = fetchedContacts.find(c => c.id === savedContactId);
              if (savedContact) {
                setSelectedContact(savedContact);
              } else {
                setSelectedContact(fetchedContacts[0] || null);
              }
            } else {
              setSelectedContact(fetchedContacts[0] || null);
            }
          } else if (!fetchedContacts.some(c => c.id === selectedContact.id)) {
            // Current selectedContact is no longer valid, but try to keep selection if possible
            const savedContactId = localStorage.getItem('selectedContactId');
            if (savedContactId) {
              const savedContact = fetchedContacts.find(c => c.id === savedContactId);
              if (savedContact) {
                setSelectedContact(savedContact);
              } else {
                setSelectedContact(fetchedContacts[0] || null);
              }
            } else {
              setSelectedContact(fetchedContacts[0] || null);
            }
          }
          
          setInitialContactLoadComplete(true);
  
        }
      }, (error) => {
        if (isSubscribed) {
          console.error("messages/page.tsx: Error fetching contacts:", error);
          setInitialContactLoadComplete(true);
          setContactsLoading(false); // Ensure loading state is reset on error
          showErrorToast("Failed to load contacts.");
        }
      });
    } else {
      if (isSubscribed) {
        setContacts([]);
        setSelectedContact(null);
        setContactsLoading(false); // Ensure loading state is reset
        if (!authLoading && !user) {
          setInitialContactLoadComplete(true);
        }
      }
    }
    
    return () => {
      isSubscribed = false;
      if (unsubscribeContacts) {
        unsubscribeContacts();
      }
    };
  }, [user, authLoading]);

  // Select contact from query param if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const contactId = params.get('contactId');
    if (contactId && contacts.length > 0) {
      const found = contacts.find(c => c.id === contactId);
      if (found) setSelectedContact(found);
    }
  }, [contacts]);

  // Handle onboarding parameter to auto-trigger onboarding modal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const shouldShowOnboarding = params.get('onboarding') === 'true';
    
    if (shouldShowOnboarding && user && !showOnboardingModal) {
      setShowOnboardingModal(true);
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('onboarding');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [user, showOnboardingModal]);

  // Save selected contact to localStorage whenever it changes
  useEffect(() => {
    if (selectedContact && typeof window !== 'undefined') {
      localStorage.setItem('selectedContactId', selectedContact.id);
    }
  }, [selectedContact]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Optimized Messages Listener - Removed redundant listener since useContactMessageData handles this
  // This was causing duplicate reads and unnecessary complexity
  useEffect(() => {
    // The useContactMessageData hook now handles all message data fetching efficiently
    // This effect is kept for any future contact-level optimizations
    if (!user?.uid) {
      setContactLastMessageMap(new Map());
    }
  }, [user?.uid]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside filter popover AND not on filter button
      const isFilterButton = (event.target as Element)?.closest('button[aria-label="Toggle Filters"]');
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node) && !isFilterButton) {
        setShowFilters(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showFilters || showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters, showEmojiPicker]);

  useEffect(() => {
    if (isAdding || isEditing || showOnboardingModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isAdding, isEditing, showOnboardingModal]);

  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || !selectedContact || !user) return;

    const attachmentsToStore = selectedFiles.map(file => ({ name: file.name }));

    const newMessage: SimpleMessage = {
      id: uuidv4(),
      via: selectedChannel,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      body: input.trim(),
      contactId: selectedContact.id,
      createdAt: new Date(),
      userId: user.uid,
      attachments: attachmentsToStore,
    };

    try {
      // Update to use the nested path structure
      const messagesRef = collection(db, `users/${user.uid}/contacts/${selectedContact.id}/messages`);
      await addDoc(messagesRef, {
        ...newMessage,
        createdAt: newMessage.createdAt,
      });
      setInput("");
      setSelectedFiles([]);
      
      showSuccessToast("Message sent successfully.");
    } catch (error: any) {
      showErrorToast(`Failed to send message: ${error.message}`);
      console.error("messages/page.tsx: Error sending message:", error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);

      const uniqueNewFiles = newFiles.filter(
        (newFile) => !selectedFiles.some((prevFile) => prevFile.name === newFile.name && prevFile.size === newFile.size)
      );

      setSelectedFiles((prevFiles) => [...prevFiles, ...uniqueNewFiles]);

      if (uniqueNewFiles.length > 0) {
        showSuccessToast(`Selected ${uniqueNewFiles.length} file(s).`);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedFiles((prevFiles) =>
      prevFiles.filter((file) => file !== fileToRemove)
    );
      showInfoToast(`Removed file: ${fileToRemove.name}`);

  };

  const handleEmojiSelect = (emoji: string) => {
    setInput((prevInput) => prevInput + emoji);
  };

  // Optimized contact filtering and sorting with better memoization
  const displayContacts = useMemo(() => {
      // Early return if no contacts
      if (contacts.length === 0) return [];
      
      let currentContacts = contacts;

      // Apply search filter
      if (searchQuery.trim() && fuse) {
          currentContacts = fuse.search(searchQuery).map((result) => result.item);
      }

      // Apply category filter
      if (selectedCategoryFilter.length > 0) {
          currentContacts = currentContacts.filter(contact =>
              selectedCategoryFilter.includes(contact.category)
          );
      }

      // Apply sorting
      if (sortOption === 'name-asc') {
          return [...currentContacts].sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortOption === 'name-desc') {
          return [...currentContacts].sort((a, b) => b.name.localeCompare(a.name));
      } else if (sortOption === 'recent-desc') {
          return [...currentContacts].sort((a, b) => {
              const aTime = contactLastMessageMap.get(a.id);
              const bTime = contactLastMessageMap.get(b.id);

              if (aTime && !bTime) return -1;
              if (!aTime && !bTime) return a.name.localeCompare(b.name);
              if (!aTime && bTime) return 1;

              return (bTime?.getTime() || 0) - (aTime?.getTime() || 0);
          });
      }
      
      // Default sort
      return [...currentContacts].sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, searchQuery, fuse, selectedCategoryFilter, sortOption, contactLastMessageMap]);

  // Optimized categories computation
  const allCategories = useMemo(() => {
      if (contacts.length === 0) return [];
      
      const categories = new Set<string>();
      for (const contact of contacts) {
          categories.add(contact.category);
      }
      return Array.from(categories).sort();
  }, [contacts]);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategoryFilter((prevSelected) => {
      if (prevSelected.includes(category)) {
        return prevSelected.filter((cat) => cat !== category);
      } else {
        return [...prevSelected, category];
      }
    });
  }, []);

  const handleClearCategoryFilter = useCallback((categoryToClear: string) => {
    setSelectedCategoryFilter((prev) => prev.filter(cat => cat !== categoryToClear));
  }, []);

  const handleClearAllCategoryFilters = useCallback(() => {
    setSelectedCategoryFilter([]);
  }, []);

  const handleClearSortOption = useCallback(() => {
    setSortOption('name-asc');
  }, []);

  // Mobile view mode handlers
  const handleMobileContactSelect = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setMobileViewMode('messages');
  }, []);

  const handleMobileBackToContacts = useCallback(() => {
    setMobileViewMode('contacts');
  }, []);


  // Only show content when both loading is complete AND minimum time has passed
  const isLoading = authLoading || !minLoadTimeReached;


  // Handle Gmail re-authentication success - just clear URL parameters
  useEffect(() => {
    if (!user) {
      
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const gmailAuth = params.get('gmailAuth');
    const userId = params.get('userId');



    if (gmailAuth === 'success' && userId === user.uid) {

      
      // Clear URL parameters without triggering import
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      
      // Hide the reauth banner since authentication is now valid
      setShowGmailReauthBanner(false);
      
      // Show success toast
      showSuccessToast('Gmail re-authentication successful!');
    } else {

    }
  }, [user]);

  // Removed automatic Gmail import on page load - now only manual import via banner button

  // Add the fetchContacts function
  const fetchContacts = async () => {
    if (!user) return;
    
    try {
      const contactsCollectionRef = getUserCollectionRef<Contact>("contacts", user.uid);
      const contactsQuery = query(contactsCollectionRef);
      const contactsSnapshot = await getDocs(contactsQuery);
      const fetchedContacts = contactsSnapshot.docs.map(doc => doc.data() as Contact);
      setContacts(fetchedContacts);

    } catch (error) {
      console.error('Error fetching contacts:', error);
      showErrorToast('Failed to fetch contacts. Please try again.');
    }
  };

  // Update the handleOnboardingComplete function
  const handleOnboardingComplete = async (onboardedContacts: Contact[], selectedChannelsFromModal: string[]) => {
    try {

      
      // Update contacts in Firestore
      const batch = writeBatch(db);
      onboardedContacts.forEach((contact) => {
        const contactRef = doc(getUserCollectionRef("contacts", user!.uid), contact.id);
        batch.set(contactRef, contact);
      });
      await batch.commit();
      
      // Update user document
      if (user) {
        // Convert selected channels to notification preferences
        const notificationPreferences = {
          sms: selectedChannelsFromModal.includes('SMS'),
          email: selectedChannelsFromModal.includes('Gmail'), // Gmail integration enables email notifications
          push: selectedChannelsFromModal.includes('Push'),
          inApp: selectedChannelsFromModal.includes('InApp')
        };

        await updateDoc(doc(db, "users", user.uid), {
          onboarded: true,
          selectedChannels: selectedChannelsFromModal,
          notificationPreferences
        });
      }
      
      // Refresh contacts
      await fetchContacts();
      
      // Close modal
      setShowOnboardingModal(false);
      
      // Show success message
      showSuccessToast('📞 Unified Inbox Set up successfully!');

      // If Gmail was selected, trigger the import
      if (selectedChannelsFromModal.includes('Gmail') && user) {

        try {
          await triggerGmailImport(user.uid, onboardedContacts);
          showSuccessToast('Gmail import started successfully');
        } catch (error) {
          console.error('Error during Gmail import:', error);
          showErrorToast('Failed to start Gmail import. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      showErrorToast('Failed to complete onboarding. Please try again.');
    }
  };

  // Move handleUpdateTodoDeadline inside Home to access currentUser and showErrorToast
  const handleUpdateTodoDeadline = async (todoId: string, deadline?: string | null, endDate?: string | null) => {
    if (!user) return;
    try {
      const updateObj: any = {};
      if (typeof deadline !== 'undefined') {
        updateObj.deadline = deadline && deadline !== '' ? parseLocalDateTime(deadline) : null;
      }
      if (typeof endDate !== 'undefined') {
        updateObj.endDate = endDate && endDate !== '' ? parseLocalDateTime(endDate) : null;
      }
      if (Object.keys(updateObj).length === 0) return;
      updateObj.userId = user.uid;
      // Updating todo with new deadline/endDate
      const itemRef = doc(getUserCollectionRef('todoItems', user.uid), todoId);
      await updateDoc(itemRef, updateObj);
      showSuccessToast('Deadline updated!');
      // Optionally update local state here if needed
    } catch (error) {
      console.error('Error updating deadline:', error);
      showErrorToast('Failed to update deadline.');
    }
  };

  const handleUpdateTodoNotes = async (todoId: string, notes: string) => {
    if (!user) return;
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      await updateDoc(itemRef, {
        note: notes,
        userId: user.uid
      });
      showSuccessToast('Notes updated!');
    } catch (error) {
      console.error('Error updating notes:', error);
      showErrorToast('Failed to update notes.');
    }
  };

  const handleUpdateTodoCategory = async (todoId: string, category: string) => {
    if (!user) return;
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      await updateDoc(itemRef, {
        category,
        userId: user.uid
      });
      showSuccessToast('Category updated!');
    } catch (error) {
      console.error('Error updating category:', error);
      showErrorToast('Failed to update category.');
    }
  };

  // Handler for re-import Gmail
  const handleReimportGmail = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { gmailImportCompleted: false });
      showSuccessToast("Gmail import will be retried.");
      // Optionally, immediately trigger import if tokens are present
      if (user && contacts.length > 0) {
        await triggerGmailImport(user.uid, contacts);
        showSuccessToast("Gmail import started.");
      }
    } catch (error) {
      showErrorToast("Failed to re-import Gmail. Please try again.");
      console.error("Error re-importing Gmail:", error);
    }
  };

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      };
      fetchUserData();
    }
  }, [user]);

  return (
    <div className="flex flex-col h-full bg-linen">
        {/* Show loading spinner during onboarding check */}
        {onboardingCheckLoading && (
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner size="lg" text="Checking your account..." />
          </div>
        )}

        {/* Only render dashboard content if not checking onboarding */}
        {!onboardingCheckLoading && (
        <>
        <WeddingBanner />

          <div className="app-content-container flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Gmail Re-authentication Banner - Shows when authentication is expired */}
            {showGmailReauthBanner && (
              <div className="flex-shrink-0">
                <GmailReauthBanner
                  currentUser={user}
                  onReauth={() => {
                    setShowGmailReauthBanner(false);
                  }}
                />
              </div>
            )}

            <div className="dashboard-layout">
              <main className="dashboard-main">
                <ContactsList
                  contacts={contacts}
                  contactsLoading={contactsLoading}
                  selectedContact={selectedContact}
                  setSelectedContact={handleMobileContactSelect}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  showFilters={showFilters}
                  setShowFilters={setShowFilters}
                  filterPopoverRef={filterPopoverRef}
                  allCategories={allCategories}
                  selectedCategoryFilter={selectedCategoryFilter}
                  handleCategoryChange={handleCategoryChange}
                  handleClearCategoryFilter={handleClearCategoryFilter}
                  handleClearSortOption={handleClearSortOption}
                  sortOption={sortOption}
                  setSortOption={setSortOption}
                  displayContacts={displayContacts}
                  deletingContactId={deletingContactId}
                  setIsAdding={setIsAdding}
                  unreadCounts={contactUnreadCounts}
                  mobileViewMode={mobileViewMode}
                  onMobileBackToContacts={handleMobileBackToContacts}
                  currentUserId={user?.uid || null}
                />
                <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="text-sm text-gray-500">Loading messages...</div></div>}>
                  <MessagesPanel
                    contactsLoading={messagesLoading}
                    contacts={contacts}
                    selectedContact={selectedContact}
                    currentUser={user}
                    isAuthReady={true}
                    input={input}
                    setInput={setInput}
                    draftLoading={draftLoading}
                    generateDraftMessage={handleGenerateDraftMessage}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    setIsEditing={setIsEditing}
                    onContactSelect={setSelectedContact}
                    setShowOnboardingModal={setShowOnboardingModal}
                    userName={userName}
                    showOnboardingModal={showOnboardingModal}
                    jiggleEmailField={jiggleEmailField}
                    setJiggleEmailField={setJiggleEmailField}
                    mobileViewMode={mobileViewMode}
                    onMobileBackToContacts={handleMobileBackToContacts}
                  />
                </Suspense>
              </main>

            {(user && !authLoading) ? (
              <div className="hidden lg:block lg:w-[420px]">
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="text-sm text-gray-500">Loading dashboard...</div></div>}>
                  <RightDashboardPanel
                     currentUser={user}
                      contacts={contacts}
                      rightPanelSelection={rightPanelSelection}
                      setRightPanelSelection={setRightPanelSelection}
                    onUpdateTodoDeadline={handleUpdateTodoDeadline}
                    onUpdateTodoNotes={handleUpdateTodoNotes}
                    onUpdateTodoCategory={handleUpdateTodoCategory}
                  />
                </Suspense>
              </div>
            ) : (
              <div className="hidden lg:block lg:w-[420px] min-h-full">
              </div>
            )}
            </div>
          </div>



          {isEditing && selectedContact && user && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <Suspense fallback={<div className="bg-white p-6 rounded-lg"><div className="text-sm text-gray-500">Loading edit modal...</div></div>}>
                <EditContactModal
                  contact={selectedContact}
                  userId={user.uid}
                  onClose={() => setIsEditing(false)}
                  onSave={(updated) => {
                    setContacts((prev) =>
                      prev.map((c) => (c.id === updated.id ? updated : c))
                    );
                    setSelectedContact(updated);
                    setIsEditing(false);
                  }}
                  onDelete={(deletedId: string) => {
                    setDeletingContactId(deletedId);
                    setTimeout(() => {
                      const remainingContacts = contacts.filter((c) => c.id !== deletedId);
                      setContacts(remainingContacts);
                      if (remainingContacts.length > 0) {
                        setSelectedContact(remainingContacts[0]);
                      } else {
                        setSelectedContact(null);
                      }
                      setDeletingContactId(null);
                      setIsEditing(false);
                    }, 300);
                  }}
                  jiggleEmailField={jiggleEmailField}
                />
              </Suspense>
            </div>
          )}
          {isAdding && user && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <Suspense fallback={<div className="bg-white p-6 rounded-lg"><div className="text-sm text-gray-500">Loading add modal...</div></div>}>
                <AddContactModal
                  userId={user.uid}
                  onClose={() => setIsAdding(false)}
                  onSave={(newContact) => {
                    setSelectedContact(newContact);
                  }}
                />
              </Suspense>
            </div>
          )}
            {showOnboardingModal && user && (
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"><div className="bg-white p-6 rounded-lg"><div className="text-sm text-gray-500">Loading onboarding...</div></div></div>}>
              <OnboardingModal
                userId={user.uid}
                onClose={() => setShowOnboardingModal(false)}
                onComplete={handleOnboardingComplete}
              />
            </Suspense>
          )}

          {/* Todo Templates Modal */}
          {showTemplatesModal && user && (
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"><div className="bg-white p-6 rounded-lg"><div className="text-sm text-gray-500">Loading templates...</div></div></div>}>
              <TodoTemplatesModal
                isOpen={showTemplatesModal}
                onClose={() => setShowTemplatesModal(false)}
                onSelectTemplate={async (template, allowAIDeadlines) => {
                  // Close the modal first
                  setShowTemplatesModal(false);
                  
                  // Create the todo list directly from the messages page
                  try {
                    // Convert template tasks to the format expected
                    const tasks = template.tasks.map((task: any, index: number) => {
                      const taskName = typeof task === 'string' ? task : task.name;
                      const taskNote = typeof task === 'string' ? '' : (task.note || '');
                      
                      // Determine planning phase based on template
                      let planningPhase = 'Later';
                      if (template.id === 'venue-selection') {
                        if (index < 6) planningPhase = 'Discover & Shortlist';
                        else if (index < 8) planningPhase = 'Inquire (from your Shortlist)';
                        else if (index < 14) planningPhase = 'Tour Like a Pro';
                        else planningPhase = 'Lock It In';
                      } else if (template.id === 'full-wedding-planning') {
                        if (index < 5) planningPhase = 'Kickoff (ASAP)';
                        else if (index < 9) planningPhase = 'Lock Venue + Date (early)';
                        else if (index < 13) planningPhase = 'Core Team (9–12 months out)';
                        else if (index < 16) planningPhase = 'Looks + Attire (8–10 months out)';
                        else if (index < 21) planningPhase = 'Food + Flow (6–8 months out)';
                        else if (index < 25) planningPhase = 'Paper + Details (4–6 months out)';
                        else if (index < 30) planningPhase = 'Send + Finalize (2–4 months out)';
                        else if (index < 35) planningPhase = 'Tighten Up (4–6 weeks out)';
                        else if (index < 40) planningPhase = 'Week Of';
                        else if (index < 43) planningPhase = 'Day Before';
                        else if (index < 47) planningPhase = 'Wedding Day';
                        else if (index < 51) planningPhase = 'After';
                        else planningPhase = 'Tiny "Don\'t-Forget" Wins';
                      } else {
                        planningPhase = 'Planning Phase';
                      }

                      return {
                        _id: `temp-id-${Date.now()}-${index}`,
                        name: taskName,
                        note: taskNote,
                        category: null,
                        deadline: null,
                        endDate: null,
                        planningPhase: planningPhase,
                        allowAIDeadlines: allowAIDeadlines
                      };
                    });

                    // Create the list directly in Firestore
                    const newListRef = await addDoc(getUserCollectionRef('todoLists', user.uid), {
                      name: template.name,
                      order: 0, // Will be updated by the todo page when it loads
                      userId: user.uid,
                      createdAt: new Date(),
                      orderIndex: 0
                    });

                    // Add tasks to the new list
                    if (tasks && tasks.length > 0) {
                      const batch = writeBatch(getUserCollectionRef('todoItems', user.uid).firestore);
                      
                      tasks.forEach((task, index) => {
                        const taskRef = doc(getUserCollectionRef('todoItems', user.uid));
                        batch.set(taskRef, {
                          ...task,
                          listId: newListRef.id,
                          orderIndex: index,
                          createdAt: new Date(),
                          updatedAt: new Date(),
                          deadline: task.deadline ? Timestamp.fromDate(task.deadline) : null,
                          endDate: task.endDate ? Timestamp.fromDate(task.endDate) : null
                        });
                      });
                      
                      await batch.commit();
                    }

                    showSuccessToast(`Created "${template.name}" successfully!`);
                    
                    // Trigger a custom event to notify the RightDashboardPanel to select the new list
                    window.dispatchEvent(new CustomEvent('selectTodoList', { 
                      detail: { listId: newListRef.id } 
                    }));
                  } catch (error) {
                    console.error('Error creating template list:', error);
                    showErrorToast('Failed to create template list. Please try again.');
                  }
                }}
                onCreateWithAI={() => {
                  // Redirect to todo page for AI creation
                  router.push('/todo');
                }}
              />
            </Suspense>
          )}
          
          {/* Not Enough Credits Modal */}
          <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"><div className="bg-white p-6 rounded-lg"><div className="text-sm text-gray-500">Loading credits modal...</div></div></div>}>
            <NotEnoughCreditsModalWrapper
              isOpen={showNotEnoughCreditsModal}
              onClose={() => setShowNotEnoughCreditsModal(false)}
              requiredCredits={creditModalData.requiredCredits}
              feature={creditModalData.feature}
              accountInfo={{
                tier: 'Free',
                dailyCredits: userCredits.monthlyCredits,
                refreshTime: 'Daily at midnight'
              }}
            />
          </Suspense>
        </>
      )}

      </div>
  );
}
