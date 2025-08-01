// app/page.tsx
"use client";
import { getAuth, onAuthStateChanged, User, signInWithCustomToken, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import Fuse from "fuse.js";
import MessageArea from "../components/MessageArea";

import AddContactModal from "../components/AddContactModal";
import { getAllContacts } from "../lib/getContacts";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { saveContactToFirestore } from "../lib/saveContactToFirestore";
import { useDraftMessage } from "../hooks/useDraftMessage";
import EditContactModal from "../components/EditContactModal";
import { getCategoryStyle } from "../utils/categoryStyle";
import { db, getUserCollectionRef } from "../lib/firebase";
import { useCustomToast } from "../hooks/useCustomToast";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  writeBatch,
  limit,
  getDocs,
} from "firebase/firestore";
import { Mail, Phone, Filter, X, FileUp, SmilePlus, WandSparkles, MoveRight, File, ArrowLeft, CheckCircle, Circle, MoreHorizontal, MessageSquare, Heart, ClipboardList, Users } from "lucide-react";
import CategoryPill from "../components/CategoryPill";
import SelectField from "../components/SelectField";
import { AnimatePresence, motion } from "framer-motion";
import OnboardingModal from "../components/OnboardingModal";
import RightDashboardPanel from "../components/RightDashboardPanel";
import BottomNavBar from "../components/BottomNavBar";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import Banner from "../components/Banner";
import WeddingBanner from "../components/WeddingBanner";
import { useWeddingBanner } from "../hooks/useWeddingBanner";
import GmailReauthBanner from "../components/GmailReauthBanner";
import type { TodoItem } from '../types/todo';
import { toast } from "react-hot-toast";
import { Contact } from "../types/contact";
import { SimpleMessage } from "../types/message";
import ContactsList from '../components/ContactsList';
import MessagesPanel from '../components/MessagesPanel';
import { handleLogout } from '../utils/logout';

// Declare global variables provided by the Canvas environment
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;

// Using SimpleMessage from shared types

interface RightDashboardPanelProps {
  currentUser: User;
  isMobile: boolean;
  activeMobileTab: "contacts" | "messages" | "todo";
  contacts: Contact[];
  rightPanelSelection: string | null;
  setRightPanelSelection: (selection: string | null) => void;
}

const getRelativeDate = (date: Date): string => {
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

// Skeleton component for contacts list
const ContactsSkeleton = () => (
  <div className="space-y-2 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="p-3 mb-3 rounded-[5px] border border-[#AB9C95] bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 min-w-[32px] min-h-[32px] rounded-full bg-gray-300"></div>
          <div>
            <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Skeleton component for messages
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

// Utility to remove undefined fields from an object
function removeUndefinedFields<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

// Utility to parse a yyyy-MM-ddTHH:mm string as a local Date
function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
  // Always create a local date
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

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

    console.log('Gmail import started successfully:', data);
    return data;
  } catch (error) {
    console.error('Error starting Gmail import:', error);
    throw error;
  }
};

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  console.log('Home component rendered', user, authLoading);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [jiggleEmailField, setJiggleEmailField] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const { draft, loading: draftLoading, generateDraft: generateDraftMessage } = useDraftMessage();
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [lastOnboardedContacts, setLastOnboardedContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialContactLoadComplete, setInitialContactLoadComplete] = useState(false);
  const [minLoadTimeReached, setMinLoadTimeReached] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('name-asc');
  const [contactLastMessageMap, setContactLastMessageMap] = useState<Map<string, Date>>(new Map());
  const [showFilters, setShowFilters] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast();
  const [bottomNavHeight, setBottomNavHeight] = useState(0);
  const [onboardingCheckLoading, setOnboardingCheckLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use centralized WeddingBanner hook
  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);

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

  const fuse = contacts.length
    ? new Fuse(contacts, {
        keys: ["name"],
        threshold: 0.4,
        ignoreLocation: true,
        isCaseSensitive: false,
      })
    : null;

  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState("Gmail");
  const [contactsLoading, setContactsLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'contacts' | 'messages' | 'todo'>("contacts");
  const [rightPanelSelection, setRightPanelSelection] = useState<"todo" | "messages" | "favorites">("todo");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const [userData, setUserData] = useState<any>(null);

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Gmail authentication state
  const [showGmailReauthBanner, setShowGmailReauthBanner] = useState(false);

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

  // Effect to finalize contactsLoading state
  useEffect(() => {
    if (initialContactLoadComplete && minLoadTimeReached) {
      setContactsLoading(false);
    }
  }, [initialContactLoadComplete, minLoadTimeReached]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadTimeReached(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  useEffect(() => {
    if (!authLoading && !user) {
      // Don't auto-redirect, let the logout function handle it
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && user) {
      const checkOnboarding = async () => {
        setOnboardingCheckLoading(true);
        console.log('🔍 [Onboarding Check] Starting onboarding check for user:', user.uid);
        
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        console.log('🔍 [Onboarding Check] Firestore userSnap.exists:', userSnap.exists());
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          console.log('🔍 [Onboarding Check] Firestore user data:', data);
          
          // Check if user is explicitly not onboarded (false) or if onboarded field is missing/undefined
          if (data.onboarded === false || data.onboarded === undefined || data.onboarded === null) {
            console.log('🚫 [Onboarding Check] User is not onboarded, redirecting to /signup?onboarding=1');
            router.push('/signup?onboarding=1');
            return;
          }
          
          console.log('✅ [Onboarding Check] User is onboarded, allowing access to dashboard');
          setOnboardingCheckLoading(false);
        } else {
          console.log('🚫 [Onboarding Check] No Firestore user document found for this user. Redirecting to onboarding.');
          router.push('/signup?onboarding=1');
          return;
        }
      };
      checkOnboarding();
    } else if (!authLoading && !user) {
      setOnboardingCheckLoading(false);
    }
  }, [user, authLoading, router]);

  // Function to handle user logout
  const handleLogoutClick = async () => {
    await handleLogout(router);
  };

   // Contacts Listener
  useEffect(() => {
    let unsubscribeContacts: () => void;
    if (user && user.uid) {
      setContactsLoading(true);
      const userId = user.uid;

      const contactsCollectionRef = getUserCollectionRef<Contact>("contacts", userId);

      const q = query(
        contactsCollectionRef,
        where("userId", "==", userId),
        orderBy("orderIndex", "asc")
      );

      unsubscribeContacts = onSnapshot(q, (snapshot) => {
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
        setContacts(fetchedContacts);
        if (!selectedContact || !fetchedContacts.some(c => c.id === selectedContact.id)) {
          setSelectedContact(fetchedContacts[0] || null);
        }

        setInitialContactLoadComplete(true);
        console.log(`page.tsx: Fetched ${fetchedContacts.length} contacts.`);

      }, (error) => {
        console.error("page.tsx: Error fetching contacts:", error);
        setInitialContactLoadComplete(true);
        showErrorToast("Failed to load contacts.");
      });
    } else {
      setContacts([]);
      setSelectedContact(null);

      if (!authLoading && !user) {
        setInitialContactLoadComplete(true);
      }
    }
    return () => {
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // All Messages Listener
  useEffect(() => {
    let unsubscribeAllMessages: () => void;
    if (user && user.uid) {
      const userId = user.uid;
      // Update the path to be under contacts collection
      const contactsRef = collection(db, `users/${userId}/contacts`);
      
      // Create a map to store unsubscribe functions
      const unsubscribeMap = new Map<string, () => void>();
      
      // Set up the listeners
      const setupListeners = async () => {
        const contactsSnapshot = await getDocs(contactsRef);
        
        // For each contact, set up a listener for their messages
        contactsSnapshot.docs.forEach(contactDoc => {
          const contactId = contactDoc.id;
          const contactMessagesRef = collection(db, `users/${userId}/contacts/${contactId}/messages`);
          
          const q = query(
            contactMessagesRef,
            orderBy("createdAt", "desc"),
            limit(1) // Only get the latest message
          );
          
          const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
              const latestMessage = snapshot.docs[0];
              const createdAt = latestMessage.data().createdAt.toDate();
              setContactLastMessageMap(prev => new Map(prev).set(contactId, createdAt));
            }
          });
          
          unsubscribeMap.set(contactId, unsubscribe);
        });
      };
      
      setupListeners();
      
      // Return cleanup function that unsubscribes from all listeners
      return () => {
        unsubscribeMap.forEach(unsubscribe => unsubscribe());
      };
    } else {
      setContactLastMessageMap(new Map());
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
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
      console.log("page.tsx: Message sent successfully.");
      showSuccessToast("Message sent successfully.");
    } catch (error: any) {
      showErrorToast(`Failed to send message: ${error.message}`);
      console.error("page.tsx: Error sending message:", error);
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

  const displayContacts = useMemo(() => {
      let currentContacts = searchQuery.trim() && fuse
          ? fuse.search(searchQuery).map((result) => result.item)
          : contacts;

      if (selectedCategoryFilter.length > 0) {
          currentContacts = currentContacts.filter(contact =>
              selectedCategoryFilter.includes(contact.category)
          );
      }

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
      return [...currentContacts].sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, searchQuery, fuse, selectedCategoryFilter, sortOption, contactLastMessageMap]);

  const allCategories = useMemo(() => {
      const categories = new Set<string>();
      contacts.forEach(contact => {
          categories.add(contact.category);
      });
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

  // Function to handle tab changes from BottomNavBar
  const handleMobileTabChange = useCallback((tab: 'contacts' | 'todo') => {
  setActiveMobileTab(tab);
  }, []);

  // Only show content when both loading is complete AND minimum time has passed
  const isLoading = authLoading || !minLoadTimeReached;

  useEffect(() => {
    // Show a welcome toast if the user just logged in (one-time, using localStorage flag)
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('showLoginToast') === '1') {
        showSuccessToast('Login successful, welcome back!');
        localStorage.removeItem('showLoginToast');
      }
    }
  }, []);

  // Handle Gmail re-authentication success - just clear URL parameters
  useEffect(() => {
    if (!user) {
      console.log('No current user, skipping Gmail auth check');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const gmailAuth = params.get('gmailAuth');
    const userId = params.get('userId');

    console.log('Checking Gmail auth on page load:', {
      gmailAuth,
      userId,
      urlParams: Object.fromEntries(params.entries()),
      currentUrl: window.location.href,
      currentUserId: user.uid
    });

    if (gmailAuth === 'success' && userId === user.uid) {
      console.log('Gmail re-authentication success detected, clearing URL parameters');
      
      // Clear URL parameters without triggering import
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      console.log('Cleared URL parameters after Gmail re-auth');
      
      // Hide the reauth banner since authentication is now valid
      setShowGmailReauthBanner(false);
      
      // Show success toast
      toast.success('Gmail re-authentication successful!');
    } else {
      console.log('No Gmail auth success or user ID mismatch', {
        gmailAuth,
        userId,
        currentUserId: user.uid
      });
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
      console.log('Fetched contacts:', fetchedContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to fetch contacts. Please try again.');
    }
  };

  // Update the handleOnboardingComplete function
  const handleOnboardingComplete = async (onboardedContacts: Contact[], selectedChannelsFromModal: string[]) => {
    try {
      console.log('Handling onboarding completion with contacts:', onboardedContacts);
      
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
      toast.success('Onboarding completed successfully!');

      // If Gmail was selected, trigger the import
      if (selectedChannelsFromModal.includes('Gmail') && user) {
        console.log('Gmail selected, triggering import');
        try {
          await triggerGmailImport(user.uid, onboardedContacts);
          toast.success('Gmail import started successfully');
        } catch (error) {
          console.error('Error during Gmail import:', error);
          toast.error('Failed to start Gmail import. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding. Please try again.');
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
      console.log('Updating todo:', todoId, 'with:', updateObj);
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
      toast.success("Gmail import will be retried.");
      // Optionally, immediately trigger import if tokens are present
      if (user && contacts.length > 0) {
        await triggerGmailImport(user.uid, contacts);
        toast.success("Gmail import started.");
      }
    } catch (error) {
      toast.error("Failed to re-import Gmail. Please try again.");
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
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A85C36] mx-auto mb-4"></div>
            <p className="text-[#364257]">Checking your account...</p>
          </div>
        </div>
      )}

      {/* Only render dashboard content if not checking onboarding */}
      {!onboardingCheckLoading && (
        <>
          <WeddingBanner
            daysLeft={daysLeft}
            userName={userName}
            isLoading={bannerLoading}
            onSetWeddingDate={handleSetWeddingDate}
          />

          <div className="app-content-container flex-1 overflow-hidden flex flex-col">
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

            <div className="flex flex-1 gap-4 md:flex-row flex-col overflow-hidden">

          <main className="unified-container">
            <ContactsList
              contacts={contacts}
              contactsLoading={contactsLoading}
              selectedContact={selectedContact}
              setSelectedContact={setSelectedContact}
              isMobile={isMobile}
              activeMobileTab={activeMobileTab}
              setActiveMobileTab={setActiveMobileTab}
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
            />
            <MessagesPanel
              contactsLoading={messagesLoading}
              contacts={contacts}
              selectedContact={selectedContact}
              currentUser={user}
              isAuthReady={true}
              isMobile={isMobile}
              activeMobileTab={activeMobileTab}
              setActiveMobileTab={setActiveMobileTab}
              input={input}
              setInput={setInput}
              draftLoading={draftLoading}
              generateDraftMessage={generateDraftMessage}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              setIsEditing={setIsEditing}
              onContactSelect={setSelectedContact}
              setShowOnboardingModal={setShowOnboardingModal}
              userName={userName}
              showOnboardingModal={showOnboardingModal}
              jiggleEmailField={jiggleEmailField}
              setJiggleEmailField={setJiggleEmailField}
            />
          </main>

            {(user && !authLoading) ? (
              <div className={`md:w-[420px] w-full  ${isMobile && activeMobileTab !== 'todo' ? 'hidden' : 'block'}`}>
                <RightDashboardPanel
                   currentUser={user}
                    isMobile={isMobile}
                    activeMobileTab={activeMobileTab}
                    contacts={contacts}
                    rightPanelSelection={rightPanelSelection}
                    setRightPanelSelection={setRightPanelSelection}
                  onUpdateTodoDeadline={handleUpdateTodoDeadline}
                  onUpdateTodoNotes={handleUpdateTodoNotes}
                  onUpdateTodoCategory={handleUpdateTodoCategory}
                />
              </div>
            ) : (
              <div className={`md:w-[420px] w-full min-h-full ${isMobile && activeMobileTab !== 'todo' ? 'hidden' : 'block'}`}>
              </div>
            )}
            </div>
          </div>


          {isEditing && selectedContact && user && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
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
            </div>
          )}
          {isAdding && user && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <AddContactModal
                userId={user.uid}
                onClose={() => setIsAdding(false)}
                onSave={(newContact) => {
                  setSelectedContact(newContact);
                }}
              />
            </div>
          )}
            {showOnboardingModal && user && (
            <OnboardingModal
              userId={user.uid}
              onClose={() => setShowOnboardingModal(false)}
              onComplete={handleOnboardingComplete}
            />
          )}
          {isMobile && user && (
            <BottomNavBar activeTab={activeMobileTab} onTabChange={handleMobileTabChange} />
          )}
        </>
      )}

    </div>
  );
}