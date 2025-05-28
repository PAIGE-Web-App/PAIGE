// app/page.tsx
"use client";
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Import User type
import { doc, getDoc, setDoc } from "firebase/firestore"; // Corrected: Changed '=' to 'from'
import Fuse from "fuse.js";
import AddContactModal from "../components/AddContactModal";
import { getAllContacts } from "../lib/getContacts"; // Keep this for initial load
import { useEffect, useRef, useState, useMemo, useCallback } from "react"; // Core React hooks for component logic
import { v4 as uuidv4 } from "uuid";
import { saveContactToFirestore } from "../lib/saveContactToFirestore";
import TopNav from "../components/TopNav";
import { useDraftMessage } from "../hooks/useDraftMessage";
import EditContactModal from "../components/EditContactModal";
import { getCategoryStyle } from "../utils/categoryStyle";
import toast from "react-hot-toast";
import { db } from "../lib/firebase";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot, // Import onSnapshot
  addDoc,
  writeBatch, // Import writeBatch for batch updates
} from "firebase/firestore";
// MODIFIED: Changed WandSparkples to WandSparkles
import { Mail, Phone, Filter, X, FileUp, SmilePlus, WandSparkles, MoveRight, File } from "lucide-react"; // Added WandSparkles

import CategoryPill from "../components/CategoryPill"; // Corrected import path from CategoryP2ill to CategoryPill
import SelectField from "../components/SelectField";
import { AnimatePresence, motion } from "framer-motion"; // Corrected import statement
import OnboardingModal from "../components/OnboardingModal"; // Import the new OnboardingModal


interface Message {
  id: string;
  via: string;
  timestamp: string;
  body: string;
  contactId: string;
  createdAt: Date;
  userId: string;
  attachments?: { name: string; }[]; // Added attachments property
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
  orderIndex?: number; // Added for drag-and-drop ordering (still used for default sorting)
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

// Simple EmojiPicker Component
const EmojiPicker = ({ onEmojiSelect, onClose }: { onEmojiSelect: (emoji: string) => void; onClose: () => void }) => {
  const emojis = ['😀', '😁', '😂', '🤣', '😃', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😮', '🤐', '😯', '😴', '😫', '😩', '😤', '😡', '😠', '🤬', '😈', '👿', '👹', '👺', '💀', '👻', '👽', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  return (
    // Removed positioning and width classes from here, they will be applied to the motion.div wrapper
    <div className="p-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 flex flex-wrap gap-1">
      {emojis.map((emoji, index) => (
        <button
          key={index}
          className="p-1 text-lg hover:bg-gray-100 rounded"
          onClick={() => {
            onEmojiSelect(emoji);
            onClose(); // Close picker after selection
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

// Updated triggerGmailImport to accept userId as the first argument
// MODIFIED: Added default empty array to contacts parameter
const triggerGmailImport = async (userId: string, contacts: Contact[] = []) => {
  try {
    console.log("triggerGmailImport: Sending request to /api/start-gmail-import with userId and contacts:", { userId, contacts }); // ADDED LOG
    const response = await fetch("/api/start-gmail-import", {
      method: "POST",
      // Include userId in the body if your API expects it, otherwise it's just for context
      body: JSON.stringify({ userId, contacts }),
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error("Gmail import failed");
      // You might want to add more specific error handling based on response status
    } else {
      console.log("Gmail import request sent successfully."); // ADDED LOG
      const data = await response.json();
      console.log("Gmail import response:", data); // ADDED LOG
    }
  } catch (err) {
    console.error("Gmail import error:", err);
    toast.error("An error occurred during Gmail import."); // Added toast for user feedback
  }
};



export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null); // Corrected type to Contact | null
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const { loading, generateDraft } = useDraftMessage();
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true); // State to track auth loading
  const [userName, setUserName] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // Changed to an array for multiple files
  const [showOnboardingModal, setShowOnboardingModal] = useState(false); // New state for onboarding modal
  const [currentStep, setCurrentStep] = useState<number>(1); // used by OnboardingModal
  const [lastOnboardedContacts, setLastOnboardedContacts] = useState<Contact[]>([]); // Corrected type to Contact[]

  


  // New states for filtering and sorting
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string[]>([]); // Changed to string array for multi-select
  // Changed default sort option to 'name-asc' since custom order is removed
  const [sortOption, setSortOption] = useState('name-asc');
  // MODIFIED: Corrected to use useState for Map
  const [contactLastMessageMap, setContactLastMessageMap] = useState<Map<string, Date>>(new Map());
  const [showFilters, setShowFilters] = useState(false); // New state to toggle filter visibility
  const filterPopoverRef = useRef<HTMLDivElement>(null); // Ref for the filter popover
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for the end of messages for auto-scrolling
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // New state for emoji picker visibility
  const emojiPickerRef = useRef<HTMLDivElement>(null); // Ref for the emoji picker popover


  // Declare textareaRef here, at the top level of the component
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

  const messagesCollection = collection(db, "messages");
  const contactsCollection = collection(db, "contacts"); // Reference to contacts collection
  const [messages, setMessages] = useState<Message[]>([]); // Correctly declared here
  const [selectedChannel, setSelectedChannel] = useState("Gmail"); // Correctly declared here
  const [contactsLoading, setContactsLoading] = useState(true);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
    if (!user) { // Added return here to prevent further execution if no user
      setLoadingAuth(false); // Auth state determined, no user logged in
      setCurrentUser(null);
      return;
    }
    setCurrentUser(user);
    setFirebaseInitialized(true); // Firebase is now initialized and user is set

    const urlParams = new URLSearchParams(window.location.search);
    const gmailSuccess = urlParams.get("gmailAuth") === "success";

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const completed = data.onboarded; // Changed from onboardingComplete to onboarded

      if (completed) {
        if (gmailSuccess) {
          // MODIFIED: Pass an empty array as contacts if none are available here
          await triggerGmailImport(user.uid, []);
        }
        setShowOnboardingModal(false); // Changed from setShowOnboarding to setShowOnboardingModal
      } else {
        setShowOnboardingModal(true); // Changed from setShowOnboarding to setShowOnboardingModal
      }
    } else {
      setShowOnboardingModal(true); // Changed from setShowOnboarding to setShowOnboardingModal
    }
    setLoadingAuth(false); // Auth state determined
  });

  return () => unsubscribe();
}, []);


  // NEW: useEffect to handle onboarding status and Gmail auth redirects
  useEffect(() => {
      const checkOnboardingStatus = async () => {
      if (currentUser && firebaseInitialized) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        let onboarded = false;
        if (userDocSnap.exists()) {
          onboarded = userDocSnap.data()?.onboarded || false;
        }

        console.log("DEBUG useEffect: Onboarding status read from Firestore:", onboarded); // <<< THIS ONE
        console.log("DEBUG useEffect: showOnboardingModal before update:", showOnboardingModal); // <<< THIS ONE

        if (!onboarded) {
          setShowOnboardingModal(true);
          console.log("DEBUG useEffect: Setting showOnboardingModal to TRUE."); // <<< THIS ONE
        } else {
          setShowOnboardingModal(false);
          console.log("DEBUG useEffect: Setting showOnboardingModal to FALSE."); // <<< THIS ONE
        }
      }
    };

    checkOnboardingStatus();
}, [currentUser, firebaseInitialized]); // Dependencies

  // Load contacts in real-time using onSnapshot when currentUser is available
  useEffect(() => {
    let unsubscribeContacts: () => void;
    if (currentUser) {
      setContactsLoading(true);
      console.log("Fetching contacts for userId:", currentUser.uid); // DEBUG LOG ADDED
      const q = query(
        contactsCollection,
        where("userId", "==", currentUser.uid),
        orderBy("orderIndex", "asc") // Order by orderIndex for consistent default sorting
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
            orderIndex: data.orderIndex !== undefined ? data.orderIndex : index, // Ensure orderIndex is always present
          };
        });
        setContacts(fetchedContacts);
        // Only set selected contact if it's not already set or if the previously selected one was deleted
        if (!selectedContact || !fetchedContacts.some(c => c.id === selectedContact.id)) {
          setSelectedContact(fetchedContacts[0] || null);
        }
        setContactsLoading(false);
      }, (error) => {
        console.error("Error fetching contacts:", error);
        setContactsLoading(false);
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
  }, [currentUser]); // Depend only on currentUser to re-run listener


  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return; // Use currentUser from state

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

    if (!loadingAuth) { // Only fetch user data after auth state is determined
      fetchUserData();
    }
  }, [currentUser, loadingAuth]);


  // THIS useEffect WAS NESTED, NOW IT'S A TOP-LEVEL HOOK
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // NEW useEffect for building contactLastMessageMap (listens to all user messages)
  useEffect(() => {
      let unsubscribeAllMessages: () => void;
      if (currentUser) {
          const qAllMessages = query(
              messagesCollection,
              where("userId", "==", currentUser.uid),
              orderBy("createdAt", "desc") // Order by createdAt descending to easily find the latest
          );

          unsubscribeAllMessages = onSnapshot(qAllMessages, (snapshot) => {
              const latestTimestamps = new Map<string, Date>();
              snapshot.docs.forEach((doc) => {
                  const data = doc.data();
                  const contactId = data.contactId;
                  const createdAt = data.createdAt.toDate();

                  // Only update if this message is newer than the one already recorded for this contact
                  if (!latestTimestamps.has(contactId) || latestTimestamps.get(contactId)! < createdAt) {
                      latestTimestamps.set(contactId, createdAt);
                  }
              });
              setContactLastMessageMap(latestTimestamps);
          });
      } else {
          setContactLastMessageMap(new Map()); // Clear map if no user
      }
      return () => {
          if (unsubscribeAllMessages) {
              unsubscribeAllMessages();
          }
      };
  }, [currentUser]); // Only re-run when currentUser changes

  // Existing useEffect for messages (for selected contact chat history)
  useEffect(() => {
    let unsubscribe: () => void;
    if (selectedContact && currentUser) {
      const q = query(
        messagesCollection,
        where("contactId", "==", selectedContact.id),
        where("userId", "==", currentUser.uid),
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
            attachments: data.attachments || [], // Include attachments
          };
        });
        setMessages(fetchedMessages);
      });
    } else {
      setMessages([]);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedContact, currentUser]);

  // Handle clicks outside the filter popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
      // Close emoji picker if click is outside
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showFilters || showEmojiPicker) { // Listen for clicks if either popover is open
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters, showEmojiPicker]); // Depend on both states

  // New useEffect to show toast when files are added
  useEffect(() => {
    // Only show toast if the number of files has increased
    if (selectedFiles.length > 0) { // Simpler check: if any files are selected
      toast.success(`Selected ${selectedFiles.length} file(s).`);
    }
    // No need to track previous count with a ref here, as the toast is simpler.
  }, [selectedFiles]); // Depend on selectedFiles array

  // Effect to scroll to the bottom of messages when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" }); // Changed behavior to "auto"
    }
  }, [messages]);

  // NEW: Effect to prevent body scrolling when modal is open
  useEffect(() => {
    if (isAdding || isEditing || showOnboardingModal) { // Include showOnboardingModal
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = ''; // Reset to default (usually 'auto' or '')
    }

    // Cleanup function to ensure overflow is reset when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAdding, isEditing, showOnboardingModal]); // Dependencies: re-run when isAdding, isEditing, or showOnboardingModal changes


  const handleSend = async () => {
    if (!input.trim() && selectedFiles.length === 0 || !selectedContact || !currentUser) return; // Allow sending if only file is present

    // Map selectedFiles to a simpler format for storage
    const attachmentsToStore = selectedFiles.map(file => ({ name: file.name }));

    const newMessage: Message = {
      id: uuidv4(),
      via: selectedChannel,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      body: input.trim(), // Message body is just the text input
      contactId: selectedContact.id,
      createdAt: new Date(),
      userId: currentUser.uid,
      attachments: attachmentsToStore, // Always pass an array, even if empty
    };

    try {
      await addDoc(messagesCollection, {
        ...newMessage,
        createdAt: newMessage.createdAt,
      });
      setInput("");
      setSelectedFiles([]); // Clear selected files after sending
    } catch (error: any) {
      toast.error(`Failed to send message: ${error.message}`);
      console.error("Error sending message:", error);
    }
  };

  // Handler for file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);

      setSelectedFiles((prevFiles) => {
        const uniqueNewFiles = newFiles.filter(
          (newFile) => !prevFiles.some((prevFile) => prevFile.name === newFile.name && prevFile.size === newFile.size)
        );
        // Toast moved here for immediate feedback upon selection
        if (uniqueNewFiles.length > 0) {
            toast.success(`Selected ${uniqueNewFiles.length} file(s).`);
        }
        return [...prevFiles, ...uniqueNewFiles];
      });
    }
    // Clear the input value to allow selecting the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Function to remove a specific selected file
  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedFiles((prevFiles) =>
      prevFiles.filter((file) => file !== fileToRemove)
    );
    toast(`Removed file: ${fileToRemove.name}`);
  };

  // Function to add emoji to input
  const handleEmojiSelect = (emoji: string) => {
    setInput((prevInput) => prevInput + emoji);
  };


  // Computed property for displayed contacts based on search, filter, and sort
  const displayContacts = useMemo(() => {
      let currentContacts = searchQuery.trim() && fuse
          ? fuse.search(searchQuery).map((result) => result.item)
          : contacts; // Start with the full contacts state

      // Apply category filter (now handles multiple selected categories)
      if (selectedCategoryFilter.length > 0) {
          currentContacts = currentContacts.filter(contact =>
              selectedCategoryFilter.includes(contact.category)
          );
      }

      // Apply sorting based on the selected sortOption
      if (sortOption === 'name-asc') {
          return [...currentContacts].sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortOption === 'name-desc') {
          return [...currentContacts].sort((a, b) => b.name.localeCompare(a.name));
      } else if (sortOption === 'recent-desc') {
          return [...currentContacts].sort((a, b) => {
              const aTime = contactLastMessageMap.get(a.id);
              const bTime = contactLastMessageMap.get(b.id);

              // Prioritize contacts with messages. If one has messages and the other doesn't,
              // the one with messages comes first.
              if (aTime && !bTime) return -1;
              if (!aTime && !bTime) return a.name.localeCompare(b.name); // Both no messages, sort by name
              if (!aTime && bTime) return 1; // A has no messages, B has messages, B comes first

              // If both have messages, sort by most recent (descending)
              return (bTime?.getTime() || 0) - (aTime?.getTime() || 0);
          });
      }
      // Default to sorting by name ascending if no specific sort option is matched
      // or if the initial 'custom-order' is no longer available.
      return [...currentContacts].sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, searchQuery, fuse, selectedCategoryFilter, sortOption, contactLastMessageMap]);


  // Category options for the filter dropdown (now just strings for checkboxes)
  const allCategories = useMemo(() => {
      const categories = new Set<string>();
      contacts.forEach(contact => {
          categories.add(contact.category);
      });
      // Sort categories alphabetically, excluding 'All' as it's not a real category
      return Array.from(categories).sort();
  }, [contacts]);

  // Handler for multi-select category checkboxes
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategoryFilter((prevSelected) => {
      if (prevSelected.includes(category)) {
        // If already selected, remove it
        return prevSelected.filter((cat) => cat !== category);
      } else {
        // If not selected, add it
        return [...prevSelected, category];
      }
    });
  }, []);

  // Handlers to clear filters/sorts (for the upcoming pills)
  const handleClearCategoryFilter = useCallback((categoryToClear: string) => {
    setSelectedCategoryFilter((prev) => prev.filter(cat => cat !== categoryToClear));
  }, []);

  const handleClearAllCategoryFilters = useCallback(() => {
    setSelectedCategoryFilter([]);
  }, []);


  const handleClearSortOption = useCallback(() => {
    setSortOption('name-asc');
  }, []);


  // Show a loading state for the entire page if authentication is still loading
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F2F0]">
        <div className="flex flex-col items-center">
          {/* Slick Loading Animation */}
          <div className="w-12 h-12 border-4 border-[#A85C36] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[#332B42] text-lg font-playfair">Loading application...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login (or show a login prompt)
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F2F0]">
        <p className="text-[#332B42] text-lg font-playfair">Please log in to access the dashboard.</p>
      </div>
    );
  }

  // Debugging log before passing to TopNav
  console.log("App/page.tsx: Passing userName to TopNav:", userName);
  console.log("App/page.tsx: Passing userId to TopNav:", currentUser?.uid || null);


  return (
    <>
      <TopNav userName={userName} userId={currentUser?.uid || null} /> {/* Pass userName and userId */}
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
        className="flex flex-1 gap-4 p-4 overflow-hidden bg-linen"
        style={{ maxHeight: "calc(100vh - 100px)" }}
      >
        <div
  className={`flex flex-1 border border-[#AB9C95] rounded-[5px] overflow-hidden flex-row transition-opacity duration-500 ease-in-out ${
    contactsLoading ? "opacity-0" : "opacity-100"
  }`}
  style={{ maxHeight: "100%" }}
>
          <aside className="w-full max-w-[360px] bg-[#F3F2F0] p-4 border-r border-[#AB9C95] relative"
>
            {contactsLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#F3F2F0] z-10">
                <div className="text-[#332B42] text-xs font-medium animate-pulse">Loading contacts...</div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4 relative">
                  {/* Filter Button */}
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
                  {/* Conditionally render the Add Contact button */}
                  {contacts.length > 0 && ( // Only show if at least one contact is present
                    <button
                      onClick={() => setIsAdding(true)}
                      className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0]"
                    >
                      + Add Contact
                    </button>
                  )}

                  {/* Filter and Sort Controls - Conditionally rendered as a popover */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        ref={filterPopoverRef} // Apply ref here
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
                                  // Removed custom order option
                                  { value: 'name-asc', label: 'Name (A-Z)' },
                                  { value: 'name-desc', label: 'Name (Z-A)' },
                                  { value: 'recent-desc', label: 'Most recent conversations' },
                              ]}
                          />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Applied Filters and Sorts as Pills */}
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
                          sortOption === 'recent-desc' ? 'Most recent' : '' // Removed custom order text
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
                          onClick={() => setSelectedContact(contact)}
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


          <section
            className="flex flex-col flex-1 bg-white relative"
            style={{ maxHeight: "100%" }}
          >
            {" "}
            {selectedContact ? (
              <>
                <div
                  className="bg-[#F3F2F0] w-full p-3 border-b border-[#AB9C95]"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-[16px] font-medium text-[#332B42] leading-tight font-playfair mr-1">
                          {selectedContact.name}
                        </h4>
                        <CategoryPill category={selectedContact.category} />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {selectedContact.email && (
                          <a
                            href={`mailto:${selectedContact.email}`}
                            className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            {selectedContact.email}
                          </a>
                        )}
                        {selectedContact.phone && (
                          <a
                            href={`tel:${selectedContact.phone}`}
                            className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {selectedContact.phone}
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
                            {selectedContact.website}
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
                <div
                  className="flex-1 overflow-y-auto p-3 text-sm text-gray-400 space-y-4 relative"
                >
                  {messages.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center text-center text-[#7A7A7A] px-4">
                        <img
                          src="/Messages.svg"
                          alt="Start conversation"
                          className="w-24 h-24 mb-4 opacity-50"
                        />
                        <p>Send a message to start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    (() => {
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
                                  // Apply w-[95%] to the container of attachment pills
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
                          <div ref={messagesEndRef} /> {/* Element to scroll into view */}
                        </div>
                      ));
                    })()
                  )}
                </div>
                <div
                  className="relative bg-[#F3F2F0] border-t border-[#AB9C95] z-10 sticky bottom-0" // Re-added border-t and border-[#AB9C95] here
                  style={{ minHeight: "120px", borderTopWidth: "0.5px" }} // Added borderTopWidth
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
                      {selectedFiles.length > 0 && ( // Iterate over selectedFiles
                        <div className="flex flex-wrap gap-2 mt-2 mb-2"> {/* Use flex-wrap for multiple pills */}
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="inline-flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                              <File className="w-3 h-3" /> {/* Lucide File icon */}
                              <span>{file.name}</span>
                              <button
                                onClick={() => handleRemoveFile(file)} // Pass the file to remove
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
                    className="flex justify-between items-center px-3 py-3 border-t border-[#AB9C95]" // This border is for the button area
                    style={{ borderTopWidth: "0.5px" }}
                  >
                    <div className="flex items-center gap-4 relative"> {/* New div for grouping, made relative for popover */}
                      <button
                        onClick={async () => {
                          const generated = await generateDraft(selectedContact);
                          setInput(generated);
                        }}
                        disabled={loading}
                        className="btn-secondary" // Replaced inline styles with btn-secondary
                        title="Generate a draft message using AI" // Added title
                      >
                        {loading ? (
                          "Drafting..."
                        ) : (
                          <>
                            <WandSparkles className="w-4 h-4" /> {/* MODIFIED: Changed WandSparkples to WandSparkles */}
                            Draft AI Message
                          </>
                        )}
                      </button>
                      {/* Attachment and Emoji Icons - Adjusted padding and replaced SVGs with Lucide icons */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden" // Hide the actual file input
                        multiple // Allow multiple files
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()} // Trigger click on hidden input
                        className="icon-button"
                        aria-label="Attach File"
                        title="Click to Upload File(s)" // Added title
                      >
                        <FileUp className="w-4 h-4" /> {/* Replaced SVG with Lucide FileUp, changed color */}
                      </button>
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)} // Toggle emoji picker visibility
                        className="icon-button"
                        aria-label="Add Emoji"
                        title="Add an emoji to your message"
                      >
                        <SmilePlus className="w-4 h-4" /> {/* Replaced SVG with Lucide SmilePlus, changed color */}
                      </button>
                      {/* Emoji Picker Popover */}
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div
                            ref={emojiPickerRef} // Apply ref here
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            // Applied positioning and width classes directly to motion.div
                            className="absolute bottom-full left-0 mb-2 w-64" // Changed width to w-64
                          >
                            <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() && selectedFiles.length === 0} // Disabled when input is empty AND no file is selected
                      className="btn-primary flex items-center gap-1" // Use btn-primary class and add flex for icon
                      title="Send Message" // Added title
                    >
                      Send <MoveRight className="w-4 h-4" /> {/* Replaced text with Lucide MoveRight */}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // New content for when no messages are present
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
                {/* Replaced placeholder with the actual wine.png image */}
                <img
                  src="/wine.png" // Path to the new image
                  alt="Champagne Cheers"
                  className="mb-4 w-48 h-48" // Fixed dimensions for consistency
                />
                <h2 className="text-xl font-semibold text-[#332B42] font-playfair mb-2">
                  Cheers to your next chapter.
                </h2>
                <p className="text-sm text-[#364257] mb-4 text-center max-w-xs">
                  Get ready to manage your wedding in one spot.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => setShowOnboardingModal(true)} // Open onboarding modal
                >
                  Set up your unified inbox
                </button>
                {/* Removed the "See it in action" link */}
              </div>
            )}
          </section>
        </div>
        <aside
          className="w-1/4 bg-[#ECE9E5] rounded-[5px] border border-[#AB9C95] p-4"
          style={{ maxHeight: "100%", overflowY: "auto" }}
        >
          <h3 className="font-semibold mb-2">To-do Items</h3>
          <div className="text-sm text-gray-500">No to-dos yet.</div>
        </aside>
      </div>
      {/* Edit Contact Modal - only render if currentUser is available */}
      {isEditing && selectedContact && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <EditContactModal
            contact={selectedContact}
            userId={currentUser.uid}
            onClose={() => setIsEditing(false)}
            onSave={(updated) => {
              // OPTIMISTIC UPDATE: Update local state immediately, onSnapshot will reconcile
              setContacts((prev) =>
                prev.map((c) => (c.id === updated.id ? updated : c))
              );
              setSelectedContact(updated);
              setIsEditing(false);
            }}
            onDelete={(deletedId: string) => {
              setDeletingContactId(deletedId);
              setTimeout(() => {
                // OPTIMISTIC UPDATE: Update local state immediately, onSnapshot will reconcile
                setContacts((prev) =>
                  prev.filter((c) => c.id !== deletedId)
                );
                setSelectedContact(null);
                setDeletingContactId(null);
                setIsEditing(false);
              }, 300);
            }}
          />
        </div>
      )}
      {/* Add Contact Modal - only render if currentUser is available */}
      {isAdding && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity40">
          <AddContactModal
            userId={currentUser.uid} // Pass userId to AddContactModal
            onClose={() => setIsAdding(false)}
            onSave={(newContact) => {
              setSelectedContact(newContact); // Still set selectedContact to the newly added contact
              setIsAdding(false);
            }}
          />
        </div>
      )}
        {showOnboardingModal && currentUser && (
        <OnboardingModal
          userId={currentUser.uid}
          onClose={() => setShowOnboardingModal(false)}
          onComplete={async (onboardedContacts: Contact[], selectedChannelsFromModal: string[]) => { // Corrected type to Contact[]
            setLastOnboardedContacts(onboardedContacts);
            console.log("page.tsx: OnboardingModal onComplete triggered. Received contacts:", onboardedContacts);
            console.log("page.tsx: OnboardingModal onComplete triggered. Received selectedChannels:", selectedChannelsFromModal);

            if (onboardedContacts.length > 0) {
              setSelectedContact(onboardedContacts[0]);
            }

            // --- IMPORTANT NEW LINE: Update user's onboarding status in Firestore ---
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                await setDoc(userDocRef, { onboarded: true }, { merge: true });
                console.log("page.tsx: User marked as onboarded in Firestore.");
            }
            // --- END IMPORTANT NEW LINE ---

            setShowOnboardingModal(false); // This closes the modal!

            // --- UPDATED BLOCK: Trigger Gmail import via reusable function ---
            if (selectedChannelsFromModal.includes('Gmail') && currentUser) {
              console.log("OnboardingModal: OnComplete triggered. Calling triggerGmailImport.");
              console.log("OnboardingModal: Contacts for Gmail import:", onboardedContacts);
              console.log("OnboardingModal: Selected channels for Gmail import:", selectedChannelsFromModal);
              await triggerGmailImport(currentUser.uid, onboardedContacts); // Use onboardedContacts
            }
            // --- END UPDATED BLOCK ---
                }}
        />
      )}
    </>
  );
}
