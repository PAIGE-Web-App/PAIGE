// app/page.tsx
"use client";
import { getAuth, onAuthStateChanged, User, signInWithCustomToken } from "firebase/auth"; // Removed signInAnonymously
import { doc, getDoc, setDoc } from "firebase/firestore";
import Fuse from "fuse.js";
import AddContactModal from "../components/AddContactModal";
import { getAllContacts } from "../lib/getContacts";
import { useEffect, useRef, useState, useMemo, useCallback } from "react"; // Corrected this line
import { v4 as uuidv4 } from "uuid";
import { saveContactToFirestore } from "../lib/saveContactToFirestore";
import TopNav from "../components/TopNav";
import { useDraftMessage } from "../hooks/useDraftMessage";
import EditContactModal from "../components/EditContactModal";
import { getCategoryStyle } from "../utils/categoryStyle";
import toast from "react-hot-toast";
import { db, getUserCollectionRef } from "../lib/firebase"; // Import getUserCollectionRef
import Link from "next/link";

import {
  collection, // Keep if still needed for other root collections, otherwise remove
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  writeBatch,
} from "firebase/firestore";
import { Mail, Phone, Filter, X, FileUp, SmilePlus, WandSparkles, MoveRight, File, ArrowLeft, CheckCircle, Circle, MoreHorizontal, MessageSquare, Heart, ClipboardList, Users } from "lucide-react"; // Added Users icon for contacts tab

import CategoryPill from "../components/CategoryPill";
import SelectField from "../components/SelectField";
import { AnimatePresence, motion } from "framer-motion";
import OnboardingModal from "../components/OnboardingModal";
import RightDashboardPanel from "../components/RightDashboardPanel"; // Import the new component
import BottomNavBar from "../components/BottomNavBar"; // NEW: Import the BottomNavBar component

// Declare global variables provided by the Canvas environment
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | undefined; // Make it optional

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

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category: string;
  website?: string;
  avatarColor?: string;
  userId: string;
  orderIndex?: number;
}

interface TodoItem {
  id: string;
  name: string;
  deadline?: Date;
  note?: string;
  category?: string;
  contactId?: string;
  isCompleted: boolean;
  userId: string;
  createdAt: Date;
  orderIndex: number;
  listId: string;
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

const triggerGmailImport = async (userId: string, contacts: Contact[] = []) => {
  try {
    console.log("triggerGmailImport: Sending request to /api/start-gmail-import with userId and contacts:", { userId, contacts });
    const response = await fetch("/api/start-gmail-import", {
      method: "POST",
      body: JSON.stringify({ userId, contacts }),
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error("Gmail import failed");
    } else {
      console.log("Gmail import request sent successfully.");
      const data = await response.json();
      console.log("Gmail import response:", data);
    }
  } catch (err) {
    console.error("Gmail import error:", err);
    toast.error("An error occurred during Gmail import.");
  }
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


export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const { loading, generateDraft, draftMessage, setDraftMessage } = useDraftMessage(selectedContact?.id || 'default');
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
  const [error, setError] = useState<string | null>(null); // State to hold authentication errors
  const [initialContactLoadComplete, setInitialContactLoadComplete] = useState(false); // ADD THIS LINE
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('name-asc');
  const [contactLastMessageMap, setContactLastMessageMap] = useState<Map<string, Date>>(new Map());
  const [showFilters, setShowFilters] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  const [messagesLoading, setMessagesLoading] = useState(false); // NEW: State for messages loading
  const [selectedChannel, setSelectedChannel] = useState("Gmail");
  const [contactsLoading, setContactsLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'contacts' | 'messages' | 'todo'>('contacts'); // NEW: State for active mobile tab


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
    const auth = getAuth(); // Get auth instance from the initialized app in lib/firebase.ts

    const signIn = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
          console.log('page.tsx: Signed in with custom token.');
        } else {
          console.warn('page.tsx: __initial_auth_token is NOT defined. Cannot sign in. Ensure Canvas environment is set up correctly.');
          setError('Authentication token missing. Please ensure your Canvas environment is correctly configured.');
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
      setCurrentUser(user);
      setIsAuthReady(true);
      setLoadingAuth(false);

      console.log('page.tsx: Auth state changed. User:', user ? user.uid : 'No user');
      console.log('page.tsx: __app_id:', typeof __app_id !== 'undefined' ? __app_id : 'NOT_DEFINED');
      console.log('page.tsx: __initial_auth_token:', typeof __initial_auth_token !== 'undefined' ? 'DEFINED' : 'NOT_DEFINED');

      if (user) {
        const urlParams = new URLSearchParams(window.location.search);
        const gmailSuccess = urlParams.get("gmailAuth") === "success";

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const completed = data.onboarded;

          if (completed) {
            if (gmailSuccess) {
              await triggerGmailImport(user.uid, []);
            }
            setShowOnboardingModal(false);
          } else {
            setShowOnboardingModal(true);
          }
        } else {
          setShowOnboardingModal(true);
        }
      }
    });

    signIn();

    return () => unsubscribeAuth();
  }, []);


  // Contacts Listener
  useEffect(() => {
    let unsubscribeContacts: () => void;
    if (isAuthReady && currentUser?.uid) {
      setContactsLoading(true);
      const userId = currentUser.uid;

      const contactsCollectionRef = getUserCollectionRef<Contact>("contacts", userId);
      console.log('page.tsx: Contacts Collection Path:', contactsCollectionRef.path);

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
        // Only update selectedContact if the current one is deleted or if none is selected
        if (!selectedContact || !fetchedContacts.some(c => c.id === selectedContact.id)) {
          setSelectedContact(fetchedContacts[0] || null);
        }
        setContactsLoading(false);
        setInitialContactLoadComplete(true); // ADD THIS LINE
        console.log(`page.tsx: Fetched ${fetchedContacts.length} contacts.`);
      }, (error) => {
        console.error("page.tsx: Error fetching contacts:", error);
        setContactsLoading(false);
        setInitialContactLoadComplete(true); // ADD THIS LINE (also set on error, meaning initial load attempt finished)
        toast.error("Failed to load contacts.");
      });
    } else {
      setContacts([]);
      setSelectedContact(null);
      setContactsLoading(false);
    }
    return () => {
      if (unsubscribeContacts) {
        unsubscribeContacts();
      }
    };
  }, [isAuthReady, currentUser]);


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
          const messagesCollectionRef = getUserCollectionRef<Message>("messages", userId);
          console.log('page.tsx: All Messages Collection Path:', messagesCollectionRef.path);

          const qAllMessages = query(
              messagesCollectionRef,
              where("userId", "==", userId),
              orderBy("createdAt", "desc")
          );

          unsubscribeAllMessages = onSnapshot(qAllMessages, (snapshot) => {
              const latestTimestamps = new Map<string, Date>();
              snapshot.docs.forEach((doc) => {
                  const data = doc.data();
                  const contactId = data.contactId;
                  const createdAt = data.createdAt.toDate();

                  if (!latestTimestamps.has(contactId) || latestTimestamps.get(contactId)! < createdAt) {
                      latestTimestamps.set(contactId, createdAt);
                  }
              });
              setContactLastMessageMap(latestTimestamps);
              console.log(`page.tsx: Fetched ${snapshot.docs.length} all messages for last message map.`);
          }, (err) => {
            console.error('page.tsx: Error fetching all messages for last message map:', err);
            toast.error(`Failed to load message history: ${(err as Error).message}`);
          });
      } else {
          setContactLastMessageMap(new Map());
      }
      return () => {
          if (unsubscribeAllMessages) {
              unsubscribeAllMessages();
          }
      };
  }, [isAuthReady, currentUser]);

  // Selected Contact Messages Listener
  useEffect(() => {
    let unsubscribe: () => void;
    if (isAuthReady && selectedContact && currentUser?.uid) {
      setMessagesLoading(true); // Set messages loading to true
      const userId = currentUser.uid;
      const messagesCollectionRef = getUserCollectionRef<Message>("messages", userId);
      console.log('page.tsx: Selected Contact Messages Collection Path:', messagesCollectionRef.path);

      const q = query(
        messagesCollectionRef,
        where("contactId", "==", selectedContact.id),
        where("userId", "==", userId),
        orderBy("createdAt", "asc")
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMessages: Message[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            via: data.via,
            timestamp: data.timestamp,
            body: data.body,
            contactId: data.contactId,
            createdAt: data.createdAt.toDate(),
            userId: data.userId,
            attachments: data.attachments || [],
          };
        });
        setMessages(fetchedMessages);
        setMessagesLoading(false); // Set messages loading to false after fetch
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
        console.log(`page.tsx: Fetched ${fetchedMessages.length} messages for selected contact.`);
      }, (err) => {
        console.error('page.tsx: Error fetching selected contact messages:', err);
        setMessagesLoading(false); // Set messages loading to false even on error
        toast.error(`Failed to load messages for contact: ${(err as Error).message}`);
      });
    } else {
      setMessages([]);
      setMessagesLoading(false); // Ensure loading is false if no contact is selected
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthReady, selectedContact, currentUser]);

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

  // REMOVED this useEffect as the toast is now handled directly in handleFileChange
  // useEffect(() => {
  //   if (selectedFiles.length > 0) {
  //     toast.success(`Selected ${selectedFiles.length} file(s).`);
  //   }
  // }, [selectedFiles]);

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
      const messagesCollectionRef = getUserCollectionRef<Message>("messages", currentUser.uid);
      await addDoc(messagesCollectionRef, {
        ...newMessage,
        createdAt: newMessage.createdAt,
      });
      setInput("");
      setSelectedFiles([]);
      console.log("page.tsx: Message sent successfully.");
    } catch (error: any) {
      toast.error(`Failed to send message: ${error.message}`);
      console.error("page.tsx: Error sending message:", error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);

      // Determine unique new files based on current `selectedFiles` state
      const uniqueNewFiles = newFiles.filter(
        (newFile) => !selectedFiles.some((prevFile) => prevFile.name === newFile.name && prevFile.size === newFile.size)
      );

      // Update the state with the unique new files
      setSelectedFiles((prevFiles) => [...prevFiles, ...uniqueNewFiles]);

      // Show toast message only if new unique files were actually added
      if (uniqueNewFiles.length > 0) {
          toast.success(`Selected ${uniqueNewFiles.length} file(s).`);
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
    toast(`Removed file: ${fileToRemove.name}`);
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
    setActiveMobileTab(tab);
    // If switching to messages and no contact is selected, default to the first one
    if (tab === 'messages' && !selectedContact && contacts.length > 0) {
      setSelectedContact(contacts[0]);
    }
  }, [selectedContact, contacts]);


  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F2F0]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#A85C36] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[#332B42] text-lg font-playfair">Loading application...</p>
        </div>
      </div>
    );
  }

  // Removed the error display block for authentication token missing.
  // The initial loading spinner already covers the loading state.

  return (
    <>
      <TopNav userName={userName} userId={currentUser?.uid || null} />
   <div className="bg-[#332B42] text-white text-center py-2 font-playfair text-sm tracking-wide px-4">
  {daysLeft !== null ? (
    `${daysLeft} day${daysLeft !== 1 ? "s" : ""} until the big day!`
  ) : userName ? (
    <>
      Welcome back, {userName}. Have y’all decided your wedding date?
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
    "Welcome back! Have y’all decided your wedding date?"
  )}
</div>


      <div
        className="flex flex-1 gap-4 p-4 overflow-hidden bg-linen md:flex-row flex-col" // flex-col for mobile stacking, md:flex-row for desktop
        style={{ maxHeight: "calc(100vh - 100px)" }} // Adjusted for TopNav height
      >
        {/* Main Content Area - Responsive Flex Container */}
        <div
          className={`flex md:flex-1 border border-[#AB9C95] rounded-[5px] overflow-hidden transition-opacity duration-500 ease-in-out
            ${contactsLoading ? "opacity-100" : "opacity-100"}
            ${isMobile ? 'flex-col' : 'flex-row'} `} // Stacks vertically on mobile
          style={{ maxHeight: "100%" }}
        >
          {/* Left Panel (Contact List) */}
          <aside
            className={`md:w-[360px] bg-[#F3F2F0] p-4 border-r border-[#AB9C95] relative flex-shrink-0 w-full min-h-full
              ${isMobile && activeMobileTab !== 'contacts' ? 'hidden' : 'block'}
            `} // Conditional display for mobile
            style={{ maxHeight: "100%", overflowY: "auto" }}
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
              <AnimatePresence mode="wait">
                <motion.div
                  key="contacts-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {/* START of your existing contacts list content */}
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
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-sm text-gray-500">Set up your unified inbox to add your contacts!</div>
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
                                setActiveMobileTab('messages'); // Switch to messages tab on contact select
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
                  {/* END of your existing contacts list content */}
                </motion.div>
              </AnimatePresence>
            )}
          </aside>


          {/* Center Panel (Message Area) */}
          <section
            className={`flex flex-col flex-1 bg-white relative w-full min-h-full
              ${isMobile && activeMobileTab !== 'messages' ? 'hidden' : 'block'}
            `} // Conditional display for mobile
            style={{ maxHeight: "100%" }}
          >
            {" "}
            {selectedContact ? (
              <>
                {/* Fixed Header */}
                <div
                  className="bg-[#F3F2F0] w-full p-3 border-b border-[#AB9C95] flex items-center"
                >
                  {isMobile && (
                    <button
                      onClick={() => {
                        setSelectedContact(null);
                        setActiveMobileTab('contacts'); // Go back to contacts tab
                      }}
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
                        {selectedContact.website && (
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
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0]"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {/* Scrollable Message Area */}
                <div
                  className="flex-1 overflow-y-auto p-3 text-sm text-gray-400 space-y-4 relative"
                >
                  {messagesLoading ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="messages-skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <MessagesSkeleton />
                      </motion.div>
                    </AnimatePresence>
                  ) : messages.length === 0 ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="no-messages-placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="flex flex-col items-center text-center text-[#7A7A7A] px-4">
                          <img
                            src="/Messages.svg"
                            alt="Start conversation"
                            className="w-24 h-24 mb-4 opacity-50"
                          />
                          <p>Send a message to start the conversation!</p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="actual-messages"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        {/* START of your existing messages mapping logic */}
                        {(() => {
                          let lastDate: string | null = null;
                          const messageGroups: { date: string; messages: Message[] }[] = [];

                          messages.forEach((msg) => {
                            const messageDate = getRelativeDate(msg.createdAt);
                            if (messageDate !== lastDate) {
                              lastDate = messageDate;
                              messageGroups.push({ date: messageDate, messages: [msg] });
                            } else {
                              messageGroups[messageGroups.length - 1].messages.push(msg);
                            }
                          });

                          return messageGroups.map((group, index) => (
                            <div key={index}>
                              <div className="flex items-center justify-center my-4">
                                <div className="w-1/3 border-t border-[#AB9C95]"></div>
                                <span className="mx-2 text-xs text-[#555] font-medium">
                                  {group.date}
                                </span>
                                <div className="w-1/3 border-t border-[#AB9C95]"></div>
                              </div>
                              {group.messages.map((msg) => (
                                <div key={msg.id} className="mb-4">
                                  <div
                                    className={`max-w-[80%] px-3 py-2 text-left text-[#332B42] bg-white border rounded-[15px_15px_0_15px] ${
                                      msg.via === selectedChannel
                                        ? "ml-auto border-[#A85733]"
                                        : "mr-auto border-[#AB9C95]"
                                    }`}
                                  >
                                    <div className="flex justify-between text-[11px] text-[#999] mb-1">
                                      <span>{msg.timestamp}</span>
                                      <span className="flex items-center gap-1">
                                        Via <span className="font-medium">{msg.via}</span>
                                      </span>
                                    </div>
                                    <div className="whitespace-pre-wrap text-[13px]">{msg.body}</div>
                                    {msg.attachments && msg.attachments.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2 w-[95%]">
                                        {msg.attachments.map((attachment, attIndex) => (
                                          <button
                                            key={attIndex}
                                            onClick={() => toast(`Simulating download of: ${attachment.name}. Real download requires server-side storage.`)}
                                            className="inline-flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42] hover:bg-[#F8F6F4] cursor-pointer"
                                          >
                                            <File className="w-3 h-3" />
                                            <span>{attachment.name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <div ref={messagesEndRef} />
                            </div>
                          ));
                        })()}
                        {/* END of your existing messages mapping logic */}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
                {/* Fixed Bottom Section - Message Input */}
                <div
                  className="relative bg-[#F3F2F0] border-t border-[#AB9C95] z-10 sticky bottom-0"
                  style={{ minHeight: "120px", borderTopWidth: "0.5px" }}
                >
                  <div className="px-3 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <label htmlFor="via" className="text-xs">
                        Via
                      </label>
                      <select
                        id="via"
                        className="text-xs border px-2 py-1 rounded-[5px]"
                        value={selectedChannel}
                        onChange={(e) => setSelectedChannel(e.target.value)}
                      >
                        <option value="Gmail">Gmail</option>
                        <option value="SMS">SMS</option>
                      </select>
                    </div>
                    <div className="overflow-y-auto max-h-[35vh] pr-1">
                      <textarea
                        ref={textareaRef}
                        rows={3}
                        placeholder={`Hey ${selectedContact?.name}...`}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full text-sm resize-none text-[#332B42] bg-transparent border-none focus:outline-none"
                        style={{ minHeight: "3rem" }}
                      />
                      {selectedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 mb-2">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="inline-flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                              <File className="w-3 h-3" />
                              <span>{file.name}</span>
                              <button
                                onClick={() => handleRemoveFile(file)}
                                className="ml-1 text-[#A85C36] hover:text-[#784528]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {loading && (
                        <div className="absolute inset-0 bg-[#F3F2F0] bg-opacity-80 flex flex-col justify-center items-center text-xs text-[#332B42] z-10 pointer-events-none">
                          <div className="w-4/5 max-w-md">
                            <div className="h-3 bg-[#E0DBD7] rounded mb-2 animate-pulse"></div>
                            <div className="h-3 bg-[#E0DBD7] rounded mb-2 animate-pulse w-4/5"></div>
                            <div className="h-3 bg-[#E0DBD7] rounded mb-2 animate-pulse w-3/4"></div>
                          </div>
                          <p className="mt-3 text-[11px] text-[#555] font-medium">
                            Drafting message
                            <span className="loading-dots"></span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex justify-between items-center px-3 py-3 border-t border-[#AB9C95]"
                    style={{ borderTopWidth: "0.5px" }}
                  >
                    <div className="flex items-center gap-4 relative">
                      <button
                        onClick={async () => {
                          const generated = await generateDraft(selectedContact);
                          setInput(generated);
                        }}
                        disabled={loading}
                        className="btn-secondary"
                        title="Generate a draft message using AI"
                      >
                        {loading ? (
                          "Drafting..."
                        ) : (
                          <>
                            <WandSparkles className="w-4 h-4" />
                            Draft AI Message
                          </>
                        )}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        multiple
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="icon-button"
                        aria-label="Attach File"
                        title="Click to Upload File(s)"
                      >
                        <FileUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="icon-button"
                        aria-label="Add Emoji"
                        title="Add an emoji to your message"
                      >
                        <SmilePlus className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div
                            ref={emojiPickerRef}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-full left-0 mb-2 w-64"
                          >
                            <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() && selectedFiles.length === 0}
                      className="btn-primary flex items-center gap-1"
                      title="Send Message"
                    >
                      Send <MoveRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : ( // This block runs when selectedContact is null
          // Conditional rendering based on overall loading state and contact count
          (loadingAuth || contactsLoading || !initialContactLoadComplete) ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="initial-messages-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col justify-between bg-white"
              >
                {/* Placeholder for header */}
                <div className="bg-[#F3F2F0] w-full p-3 border-b border-[#AB9C95] flex items-center h-[50px] min-h-[50px]"></div>
                {/* Main content area skeleton */}
                <div className="flex-1 overflow-y-auto p-3 text-sm text-gray-400 space-y-4 relative">
                    <MessagesSkeleton />
                </div>
                {/* Placeholder for input area */}
                <div className="relative bg-[#F3F2F0] border-t border-[#AB9C95] z-10 sticky bottom-0 min-h-[120px]"></div>
              </motion.div>
            </AnimatePresence>
          ) : ( // All loading is complete (loadingAuth is false AND contactsLoading is false)
            contacts.length === 0 ? (
              // Only show "Cheers" if no contacts are present after loading
              <AnimatePresence mode="wait">
                <motion.div
                  key="cheers-screen"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-white min-h-full"
                >
                  <img
                    src="/wine.png"
                    alt="Champagne Cheers"
                    className="mb-4 w-48 h-48"
                  />
                  <h2 className="text-xl font-semibold text-[#332B42] font-playfair mb-2">
                    Cheers to your next chapter.
                  </h2>
                  <p className="text-sm text-[#364257] mb-4 text-center max-w-xs">
                    Get ready to manage your wedding in one spot.
                  </p>
                  <button
                    className="btn-primary"
                    onClick={() => setShowOnboardingModal(true)}
                  >
                    Set up your unified inbox
                  </button>
                </motion.div>
              </AnimatePresence>
            ) : (
              // If contacts are loaded but none are selected, and there are contacts, show a "Select a contact" message
              <AnimatePresence mode="wait">
                <motion.div
                  key="select-contact-message"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-white min-h-full"
                >
                  <MessageSquare className="w-16 h-16 text-[#7A7A7A] opacity-50 mb-4" />
                  <p className="text-lg text-[#7A7A7A] font-medium">Select a contact to view messages</p>
                </motion.div>
              </AnimatePresence>
            )
          )
        )}
          </section>
        </div>
        {/* Right Panel Container - Now conditionally rendered and takes full width on mobile */}
        {(currentUser && !loadingAuth) ? ( // Only render RightDashboardPanel if currentUser is available and not loading
          <div className={`md:w-[380px] w-full min-h-full ${isMobile && activeMobileTab !== 'todo' ? 'hidden' : 'block'}`}> {/* Conditional display for mobile */}
            <RightDashboardPanel currentUser={currentUser} contacts={contacts} />
          </div>
        ) : (
          // Placeholder for the right panel to prevent layout shift
          <div className={`md:w-[380px] w-full min-h-full ${isMobile && activeMobileTab !== 'todo' ? 'hidden' : 'block'}`}>
            {/* You can add a subtle loading spinner or just keep it empty */}
          </div>
        )}
      </div>
      {/* Edit Contact Modal */}
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
                  setSelectedContact(remainingContacts[0]); // Select the first remaining contact
                } else {
                  setSelectedContact(null); // No contacts left, set to null
                }
                setDeletingContactId(null);
                setIsEditing(false);
              }, 300);
            }}
          />
        </div>
      )}
      {/* Add Contact Modal */}
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
          onComplete={async (onboardedContacts: Contact[], selectedChannelsFromModal: string[]) => {
            setLastOnboardedContacts(onboardedContacts);
            console.log("page.tsx: OnboardingModal onComplete triggered. Received contacts:", onboardedContacts);
            console.log("page.tsx: OnboardingModal onComplete triggered. Received selectedChannels:", selectedChannelsFromModal);

            if (onboardedContacts.length > 0) {
              setSelectedContact(onboardedContacts[0]);
            }

            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                await setDoc(userDocRef, { onboarded: true }, { merge: true });
                console.log("page.tsx: User marked as onboarded in Firestore.");
            }

            setShowOnboardingModal(false);

            if (selectedChannelsFromModal.includes('Gmail') && currentUser) {
              console.log("OnboardingModal: OnComplete triggered. Calling triggerGmailImport.");
              console.log("OnboardingModal: Contacts for Gmail import:", onboardedContacts);
              console.log("OnboardingModal: Selected channels for Gmail import:", selectedChannelsFromModal);
              await triggerGmailImport(currentUser.uid, onboardedContacts);
            }
                }}
        />
      )}
      {isMobile && currentUser && ( // Render BottomNavBar only on mobile and if user is logged in
        <BottomNavBar activeTab={activeMobileTab} onTabChange={handleMobileTabChange} />
      )}
    </>
  );
}