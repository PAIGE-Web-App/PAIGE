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
import TopNav from "../components/TopNav";
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
import type { TodoItem } from '../types/todo';
import { toast } from "react-hot-toast";
import { Contact } from "../types/contact";

// Declare global variables provided by the Canvas environment
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined;

interface Message {
  id: string;
  via: string;
  timestamp: string;
  body: string;
  contactId: string;
  createdAt: Date;
  userId: string;
  attachments?: { name: string; }[];
}

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
  );
}

// Utility to parse a yyyy-MM-ddTHH:mm string as a local Date
function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const { draft, loading: draftLoading, generateDraft: generateDraftMessage } = useDraftMessage();
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter(); // Initialize useRouter hook

  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const fuse = contacts.length
    ? new Fuse(contacts, {
        keys: ["name"],
        threshold: 0.4,
        ignoreLocation: true,
        isCaseSensitive: false,
      })
    : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("Gmail");
  const [contactsLoading, setContactsLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"contacts" | "messages" | "todo">("contacts");
  const [rightPanelSelection, setRightPanelSelection] = useState<"todo" | "messages" | "favorites">("todo");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const [userData, setUserData] = useState<any>(null);

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

  // Main Firebase Initialization and Authentication Effect
  useEffect(() => {
    const auth = getAuth();

    const signIn = async () => {
      try {
        // Check if we're in a Canvas environment
        const isCanvasEnvironment = typeof __initial_auth_token !== 'undefined';
        
        if (isCanvasEnvironment && __initial_auth_token) {
          // Canvas environment with token
          await signInWithCustomToken(auth, __initial_auth_token);
          console.log('page.tsx: Signed in with custom token in Canvas environment.');
        } else {
          // Not in Canvas environment, let the normal auth flow handle it
          console.log('page.tsx: Not in Canvas environment, using normal auth flow');
        }
      } catch (e) {
        console.error('page.tsx: Firebase sign-in error:', e);
        setError(`Authentication failed: ${(e as Error).message}`);
      } finally {
        setIsAuthReady(true);
        setLoadingAuth(false);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log("page.tsx: Auth state change handler triggered");
      setCurrentUser(user);
      console.log("page.tsx: onAuthStateChanged - currentUser:", user);
      setIsAuthReady(true);
      setLoadingAuth(false);

      if (!user) {
        console.log('page.tsx: No user found, redirecting to login');
        window.location.href = '/login';
        return;
      }

      console.log('page.tsx: Auth state changed. User:', user.uid);
      console.log('page.tsx: __app_id:', typeof __app_id !== 'undefined' ? __app_id : 'NOT_DEFINED');
      console.log('page.tsx: __initial_auth_token:', typeof __initial_auth_token !== 'undefined' ? 'DEFINED' : 'NOT_DEFINED');

      console.log("page.tsx: User is authenticated, checking Gmail auth status");
      const urlParams = new URLSearchParams(window.location.search);
      const gmailSuccess = urlParams.get("gmailAuth") === "success";
      
      console.log("page.tsx: Checking Gmail auth status:", {
        gmailSuccess,
        urlParams: Object.fromEntries(urlParams.entries()),
        currentUrl: window.location.href
      });

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const completed = data.onboarded;
        console.log("page.tsx: User data from Firestore:", {
          onboarded: completed,
          hasGoogleTokens: !!data.googleTokens,
          googleTokens: data.googleTokens ? {
            hasAccessToken: !!data.googleTokens.accessToken,
            hasRefreshToken: !!data.googleTokens.refreshToken,
            expiresAt: data.googleTokens.expiresAt
          } : null
        });

        // Check if user has any contacts
        const contactsCollectionRef = getUserCollectionRef<Contact>("contacts", user.uid);
        // To check for existence, create a query with limit(1) and use getDocs
        const contactsQuery = query(contactsCollectionRef, limit(1));
        const contactsSnapshot = await getDocs(contactsQuery);
        const hasContacts = !contactsSnapshot.empty;

        console.log("page.tsx: Contacts check:", {
          hasContacts,
          contactsCount: contactsSnapshot.size
        });

        // Show onboarding modal if not completed AND no contacts exist
        // If completed OR contacts exist, don't show the onboarding modal.
        if (completed || hasContacts) {
          if (gmailSuccess) {
            console.log("page.tsx: Gmail auth success detected, preparing to import");
            // Get all contacts for the user
            const contactsQuery = query(contactsCollectionRef);
            const contactsSnapshot = await getDocs(contactsQuery);
            const contacts = contactsSnapshot.docs.map(doc => doc.data() as Contact);
            
            console.log("page.tsx: Gmail auth success, triggering import with contacts:", contacts);
            try {
              await triggerGmailImport(user.uid, contacts);
              console.log("page.tsx: Gmail import completed successfully");
            } catch (error) {
              console.error("page.tsx: Error during Gmail import:", error);
            }
          } else {
            console.log("page.tsx: No Gmail auth success parameter found");
          }
          setShowOnboardingModal(false);
        } else {
          console.log("page.tsx: Showing onboarding modal - user not completed or no contacts");
          setShowOnboardingModal(true);
        }
      } else {
        setShowOnboardingModal(true);
      }
    });

    signIn();

    return () => unsubscribeAuth();
  }, []);

  // NEW useEffect for redirection
  useEffect(() => {
    // Only redirect to /login if user is truly not logged in
    if (!user && !authLoading) {
      router.push('/login');
    }
  }, [user, authLoading, router]);


  // Function to handle user logout
  const handleLogout = async () => {
    try {
      // First clear the session cookie
      await fetch('/api/sessionLogout', { 
        method: 'POST',
        credentials: 'include'
      });
      
      // Then sign out from Firebase
      const auth = getAuth();
      await signOut(auth);
      
      // Finally redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('page.tsx: Error signing out:', error);
      showErrorToast(`Failed to log out: ${(error as Error).message}`);
    }
  };


   // Contacts Listener
  useEffect(() => {
    let unsubscribeContacts: () => void;
    if (isAuthReady && currentUser?.uid) {
      setContactsLoading(true);
      const userId = currentUser.uid;

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

      if (!loadingAuth && isAuthReady && !currentUser) {
        setInitialContactLoadComplete(true);
      }
    }
    return () => {
      if (unsubscribeContacts) {
        unsubscribeContacts();
      }
    };
  }, [isAuthReady, currentUser, loadingAuth]);


  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthReady || !currentUser) return;

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();

        if (data.userName) {
          setUserName(data.userName);
        }

        if (data.weddingDate?.seconds) {
          const date = new Date(data.weddingDate.seconds * 1000);
          setWeddingDate(date);

          const today = new Date();
          const diffTime = date.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysLeft(diffDays);
        } else {
          setDaysLeft(null);
        }
      }
    };

    if (!loadingAuth) {
      fetchUserData();
    }
  }, [currentUser, loadingAuth, isAuthReady]);


  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // All Messages Listener
  useEffect(() => {
    let unsubscribeAllMessages: () => void;
    if (isAuthReady && currentUser?.uid) {
      const userId = currentUser.uid;
      // Update the path to be under contacts collection
      const contactsRef = collection(db, `artifacts/default-app-id/users/${userId}/contacts`);
      
      // Create a map to store unsubscribe functions
      const unsubscribeMap = new Map<string, () => void>();
      
      // Set up the listeners
      const setupListeners = async () => {
        const contactsSnapshot = await getDocs(contactsRef);
        
        // For each contact, set up a listener for their messages
        contactsSnapshot.docs.forEach(contactDoc => {
          const contactId = contactDoc.id;
          const contactMessagesRef = collection(db, `artifacts/default-app-id/users/${userId}/contacts/${contactId}/messages`);
          
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
  }, [isAuthReady, currentUser?.uid]);

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
    if ((!input.trim() && selectedFiles.length === 0) || !selectedContact || !currentUser) return;

    const attachmentsToStore = selectedFiles.map(file => ({ name: file.name }));

    const newMessage: Message = {
      id: uuidv4(),
      via: selectedChannel,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      body: input.trim(),
      contactId: selectedContact.id,
      createdAt: new Date(),
      userId: currentUser.uid,
      attachments: attachmentsToStore,
    };

    try {
      // Update to use the nested path structure
      const messagesRef = collection(db, `artifacts/default-app-id/users/${currentUser.uid}/contacts/${selectedContact.id}/messages`);
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
const handleMobileTabChange = useCallback((tab: 'contacts' | 'messages' | 'todo') => {
  console.log('handleMobileTabChange called with tab:', tab);
  setActiveMobileTab(tab);
  // If switching to messages and no contact is currently selected, select the first one if available
  if (tab === 'messages' && !selectedContact && contacts.length > 0) {
    setSelectedContact(contacts[0]);
  }
}, [selectedContact, contacts]);

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

  // Add effect to handle Gmail import on page load
  useEffect(() => {
    if (!user) {
      console.log('No current user, skipping Gmail import check');
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
      console.log('Gmail auth success detected, triggering import');
      const triggerImport = async () => {
        try {
          const contactsCollectionRef = getUserCollectionRef<Contact>("contacts", user.uid);
          const contactsQuery = query(contactsCollectionRef);
          const contactsSnapshot = await getDocs(contactsQuery);
          const contacts = contactsSnapshot.docs.map(doc => doc.data() as Contact);
          
          console.log('Triggering Gmail import with contacts:', contacts);
          await triggerGmailImport(user.uid, contacts);
          console.log('Gmail import completed successfully');

          // Clear URL parameters
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
          console.log('Cleared URL parameters');

          // Show success toast
          toast.success('Gmail messages imported successfully!');
        } catch (error) {
          console.error('Error during Gmail import:', error);
          toast.error('Failed to import Gmail messages. Please try again.');
        }
      };

      triggerImport();
    } else {
      console.log('No Gmail auth success or user ID mismatch', {
        gmailAuth,
        userId,
        currentUserId: user.uid
      });
    }
  }, [user]);

  // Add effect to check for Gmail tokens and trigger import if needed
  useEffect(() => {
    const checkGmailTokens = async () => {
      if (!user) {
        console.log('No current user, skipping Gmail import check');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        console.log('Checking Gmail tokens:', {
          hasGoogleTokens: !!userData?.googleTokens,
          gmailImportCompleted: userData?.gmailImportCompleted,
          hasAccessToken: !!userData?.googleTokens?.accessToken,
          hasRefreshToken: !!userData?.googleTokens?.refreshToken
        });

        if (userData?.googleTokens && !userData?.gmailImportCompleted) {
          console.log('Found Gmail tokens, triggering import');
          const contactsCollectionRef = getUserCollectionRef<Contact>("contacts", user.uid);
          const contactsQuery = query(contactsCollectionRef);
          const contactsSnapshot = await getDocs(contactsQuery);
          const contacts = contactsSnapshot.docs.map(doc => doc.data() as Contact);
          
          if (contacts.length > 0) {
            console.log('Triggering Gmail import with contacts:', contacts);
            const result = await triggerGmailImport(user.uid, contacts);
            console.log('Gmail import result:', result);

            if (result.success) {
              // Update user document to mark import as completed
              await updateDoc(doc(db, "users", user.uid), {
                gmailImportCompleted: true
              });
              toast.success('Gmail messages imported successfully!');
            } else {
              toast.error(result.message || 'Failed to import Gmail messages');
            }
          } else {
            console.log('No contacts found, skipping Gmail import');
          }
        } else {
          console.log('No Gmail tokens found or import already completed');
        }
      } catch (error) {
        console.error('Error checking Gmail tokens:', error);
        toast.error('Failed to import Gmail messages. Please try again.');
      }
    };

    checkGmailTokens();
  }, [user]);

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
        const contactRef = doc(db, "contacts", contact.id);
        batch.set(contactRef, contact);
      });
      await batch.commit();
      
      // Update user document
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          onboarded: true,
          selectedChannels: selectedChannelsFromModal
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
  const handleUpdateTodoDeadline = async (todoId: string, deadline: string | null) => {
    if (!currentUser) return;
    try {
      console.log('handleUpdateTodoDeadline called with:', todoId, deadline);
      const itemRef = doc(getUserCollectionRef("todoItems", currentUser.uid), todoId);
      let deadlineDate: Date | null = null;
      if (deadline && typeof deadline === 'string') {
        deadlineDate = parseLocalDateTime(deadline);
        if (isNaN(deadlineDate.getTime())) {
          throw new Error('Invalid date string');
        }
      }
      console.log('Saving deadline as Date:', deadlineDate);
      await updateDoc(itemRef, {
        deadline: deadlineDate,
        userId: currentUser.uid
      });
      showSuccessToast('Deadline updated!');
      // Debug: fetch the updated doc
      const updatedDoc = await getDoc(itemRef);
      console.log('Updated Firestore doc deadline:', updatedDoc.data()?.['deadline']);
    } catch (error) {
      console.error('Error updating deadline:', error);
      showErrorToast('Failed to update deadline.');
    }
  };

  // Handler for re-import Gmail
  const handleReimportGmail = async () => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { gmailImportCompleted: false });
      toast.success("Gmail import will be retried.");
      // Optionally, immediately trigger import if tokens are present
      if (currentUser && contacts.length > 0) {
        await triggerGmailImport(currentUser.uid, contacts);
        toast.success("Gmail import started.");
      }
    } catch (error) {
      toast.error("Failed to re-import Gmail. Please try again.");
      console.error("Error re-importing Gmail:", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      const fetchUserData = async () => {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      };
      fetchUserData();
    }
  }, [currentUser]);

  return (
    <div className="flex flex-col min-h-screen bg-linen">
      <TopNav 
        userName={user?.displayName || user?.email || 'Guest'} 
        userId={user?.uid || null} 
        onLogout={handleLogout}
        isLoading={isLoading}
      />
      <div className="bg-[#332B42] text-white text-center py-2 font-playfair text-sm tracking-wide px-4">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-[#4A3F5C] rounded w-48 mx-auto"></div>
          </div>
        ) : weddingDate ? (
          `${daysLeft} day${daysLeft !== 1 ? "s" : ""} until the big day!`
        ) : userName ? (
          <>
            Welcome back, {userName}. Have y'all decided your wedding date?
            <button
              onClick={() => {
                // Placeholder for setting wedding date
              }}
              className="ml-2 underline text-[#F3F2F0] hover:text-[#E0DBD7] text-sm"
            >
              Set it now
            </button>
          </>
        ) : (
          "Welcome back! Have y'all decided your wedding date?"
        )}
        {userData?.googleTokens && (
          <>
            <button
              className="ml-2 px-4 py-1 rounded border-2 border-orange-500 text-orange-700 text-xs font-semibold hover:bg-orange-100"
              onClick={() => {
                if (!currentUser) return;
                const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
                window.location.href = `/api/auth/google/initiate?userId=${currentUser.uid}&redirectUri=${redirectUri}`;
              }}
            >
              Reauthenticate Gmail
            </button>
          </>
        )}
      </div>

      <div
        className="flex flex-1 gap-4 p-4 overflow-hidden bg-linen md:flex-row flex-col"
        style={{ maxHeight: "calc(100vh - 100px)" }}
      >

      <main className={`flex flex-1 border border-[#AB9C95] rounded-[5px] overflow-hidden`}>
        <aside
          className={`md:w-[360px] bg-[#F3F2F0] p-4 border-r border-[#AB9C95] relative flex-shrink-0 w-full min-h-full
            ${isMobile ? (activeMobileTab === 'contacts' ? 'block' : 'hidden') : 'block'}
          `}
          style={{ maxHeight: '100%', overflowY: 'auto' }}
        >
          {contactsLoading ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="contacts-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ContactsSkeleton />
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4 relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-[#332B42] border border-[#AB9C95] rounded-[5px] p-2 hover:bg-[#F3F2F0] flex items-center justify-center z-20"
                  aria-label="Toggle Filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AB9C95]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-6 text-xs text-[#332B42] border-0 border-b border-[#AB9C95] focus:border-[#A85C36] focus:ring-0 py-1 placeholder:text-[#AB9C95] focus:outline-none bg-transparent"
                  />
                </div>
                {contacts.length > 0 && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0]"
                  >
                    + Add Contact
                  </button>
                )}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      ref={filterPopoverRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 p-4 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 min-w-[250px] space-y-3"
                    >
                      <div>
                        <span className="text-xs font-medium text-[#332B42] block mb-2">Filter by Category</span>
                        <div className="flex flex-wrap gap-2">
                          {allCategories.map((category) => (
                            <label key={category} className="flex items-center text-xs text-[#332B42] cursor-pointer">
                              <input
                                type="checkbox"
                                value={category}
                                checked={selectedCategoryFilter.includes(category)}
                                onChange={() => handleCategoryChange(category)}
                                className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                              />
                              {category}
                            </label>
                          ))}
                        </div>
                      </div>
                      <SelectField
                        label="Sort by"
                        name="sortOption"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        options={[
                          { value: 'name-asc', label: 'Name (A-Z)' },
                          { value: 'name-desc', label: 'Name (Z-A)' },
                          { value: 'recent-desc', label: 'Most recent conversations' },
                        ]}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {(selectedCategoryFilter.length > 0 || sortOption !== 'name-asc') && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedCategoryFilter.map((category) => (
                    <span key={category} className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                      Category: {category}
                      <button onClick={() => handleClearCategoryFilter(category)} className="ml-1 text-[#A85C36] hover:text-[#784528]">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {sortOption !== 'name-asc' && (
                    <span className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                      Sort: {
                        sortOption === 'name-desc' ? 'Name (Z-A)' :
                        sortOption === 'recent-desc' ? 'Most recent' : ''
                      }
                      <button onClick={handleClearSortOption} className="ml-1 text-[#A85C36] hover:text-[#784528]">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
              {displayContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="text-base text-[#332B42] font-playfair font-semibold mb-2">Set up your unified inbox</div>
                  <div className="text-sm text-gray-500">Add your first contact to get started!</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayContacts.map((contact, index) => {
                    const name = contact.name;
                    const matchIndex = name.toLowerCase().indexOf(
                      searchQuery.toLowerCase()
                    );
                    const before = name.slice(0, matchIndex);
                    const match = name.slice(matchIndex, matchIndex + searchQuery.length);
                    const after = name.slice(matchIndex + searchQuery.length);
                    return (
                      <div
                        key={contact.id}
                        className={`p-3 mb-3 rounded-[5px] border cursor-pointer transition-all duration-300 ease-in-out ${deletingContactId === contact.id
                          ? "opacity-0"
                          : "opacity-100"
                          } ${selectedContact?.id === contact.id
                            ? "bg-[#EBE3DD] border-[#A85C36]"
                            : "hover:bg-[#F8F6F4] border-transparent hover:border-[#AB9C95]"
                          }`}
                        onClick={() => {
                          setSelectedContact(contact);
                          if (isMobile) {
                            setActiveMobileTab('messages');
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-8 w-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-white text-[14px] font-normal font-work-sans"
                            style={{ backgroundColor: contact.avatarColor || "#364257" }}
                          >
                            {contact.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#332B42]">
                              {matchIndex >= 0 ? (
                                <>
                                  {before}
                                  <mark className="bg-transparent text-[#A85C36] font-semibold">
                                    {match}
                                  </mark>
                                  {after}
                                </>
                              ) : (
                                name
                              )}
                            </div>
                            <CategoryPill category={contact.category} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </aside>
        {/* Messaging Area */}
        {contactsLoading ? (
          <div className="flex flex-1 min-h-full h-full w-full items-center justify-center bg-white">
            <div className="w-full max-w-xl">
              <MessagesSkeleton />
            </div>
          </div>
        ) : (
          <section
            className={`flex flex-col flex-1 bg-white relative w-full min-h-full
              ${isMobile ? (activeMobileTab === 'messages' ? 'block' : 'hidden') : 'block'}
            `}
          >
            {contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <img src="/wine.png" alt="Cheers" className="w-48 h-48 mb-6" />
                <h4 className="text-2xl font-playfair font-semibold text-[#332B42] mb-2">Cheers to your next chapter!</h4>
                <p className="text-base text-[#364257] mb-6 max-w-md text-center">
                  Add your contacts to get started
                </p>
                <button
                  className="btn-primary px-6 py-2 rounded-[8px] font-semibold text-base"
                  onClick={() => setShowOnboardingModal(true)}
                >
                  Set up your Unified Inbox
                </button>
              </div>
            ) : (
              <MessageArea
                selectedContact={selectedContact}
                currentUser={currentUser}
                isAuthReady={isAuthReady}
                contacts={contacts}
                isMobile={isMobile}
                setActiveMobileTab={setActiveMobileTab}
                input={input}
                setInput={setInput}
                draftLoading={draftLoading}
                generateDraft={() => selectedContact ? generateDraftMessage({ name: selectedContact.name, category: selectedContact.category }, []) : Promise.resolve("")}
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                contactsLoading={contactsLoading}
                setIsEditing={setIsEditing}
                onContactSelect={setSelectedContact}
                onSetupInbox={() => setShowOnboardingModal(true)}
              />
            )}
          </section>
        )}
      </main>

        {(currentUser && !loadingAuth) ? (
          <div className={`md:w-[420px] w-full  ${isMobile && activeMobileTab !== 'todo' ? 'hidden' : 'block'}`}>
            <RightDashboardPanel
               currentUser={currentUser}
                isMobile={isMobile}
                activeMobileTab={activeMobileTab}
                contacts={contacts}
                rightPanelSelection={rightPanelSelection}
                setRightPanelSelection={setRightPanelSelection}
            />
          </div>
        ) : (
          <div className={`md:w-[420px] w-full min-h-full ${isMobile && activeMobileTab !== 'todo' ? 'hidden' : 'block'}`}>
          </div>
        )}
      </div>


      {isEditing && selectedContact && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <EditContactModal
            contact={selectedContact}
            userId={currentUser.uid}
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
          />
        </div>
      )}
      {isAdding && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <AddContactModal
            userId={currentUser.uid}
            onClose={() => setIsAdding(false)}
            onSave={(newContact) => {
              setSelectedContact(newContact);
            }}
          />
        </div>
      )}
        {showOnboardingModal && currentUser && (
        <OnboardingModal
          userId={currentUser.uid}
          onClose={() => setShowOnboardingModal(false)}
          onComplete={handleOnboardingComplete}
        />
      )}
      {isMobile && currentUser && (
        <BottomNavBar activeTab={activeMobileTab} onTabChange={handleMobileTabChange} />
      )}

    </div>
  );
}