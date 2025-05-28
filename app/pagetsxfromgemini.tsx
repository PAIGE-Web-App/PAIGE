// app/page.tsx
"use client";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Fuse from "fuse.js";
import AddContactModal from "../components/AddContactModal";
import { getAllContacts } from "../lib/getContacts";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
  onSnapshot,
  addDoc,
  writeBatch,
} from "firebase/firestore";
import { Mail, Phone, Filter, X, FileUp, SmilePlus, WandSparkles, MoveRight, File } from "lucide-react";

import CategoryPill from "../components/CategoryPill";
import SelectField from "../components/SelectField";
import { AnimatePresence, motion } from "framer-motion";
import OnboardingModal from "../components/OnboardingModal"; // Ensure OnboardingModal is imported

// Interface definitions (ensure these match your project's interfaces)
interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: string;
  website: string | null;
  avatarColor: string;
  userId: string;
  orderIndex?: number;
}

interface Message {
  id: string;
  via: string;
  timestamp: string;
  body: string;
  contactId: string;
  createdAt: Date;
  userId: string;
  attachments: { name: string }[];
}

// Function to check if a user is new (not yet completed onboarding)
// This function assumes a user document in Firestore will have an 'onboarded' field set to true once onboarding is complete.
async function checkIfUserIsNew(userId: string): Promise<boolean> {
  const userDocRef = doc(db, "users", userId);
  const userDocSnap = await getDoc(userDocRef);
  // User is considered new if their document doesn't exist or 'onboarded' field is not true
  return !userDocSnap.exists() || !userDocSnap.data()?.onboarded;
}


// Define the new reusable function to trigger Gmail import
const triggerGmailImport = async (userId: string, contacts: any[]) => {
  console.log("Attempting to trigger Gmail import for user:", userId);
  const contactEmails = contacts
    .map(contact => contact.email)
    .filter((email): email is string => email !== null);

  if (contactEmails.length > 0) {
    try {
      console.log("Onboarding: Gmail channel selected. Initiating import..."); // Added this specific log
      const response = await fetch('/api/start-gmail-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          contactEmails: contactEmails,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Gmail import started successfully!");
        console.log("Gmail import API response:", data.message);
        if (data.notFoundContacts && data.notFoundContacts.length > 0) {
          toast.info(`Some contacts might not have direct email history: ${data.notFoundContacts.map(c => c.name || c.email).join(', ')}. You can try adding them to your Google Contacts.`);
        }
      } else {
        toast.error(`Failed to start Gmail import: ${data.message}`);
        console.error("Gmail import API error:", data.message);
      }
    } catch (error) {
      toast.error("An error occurred while initiating Gmail import.");
      console.error("Fetch error for Gmail import API:", error);
    }
  } else {
    console.log("No contacts with emails found to import Gmail messages for.");
    toast.info("No contacts with emails found for Gmail import.");
  }
};



export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const { loading, generateDraft } = useDraftMessage();
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // For internal onboarding logic
  const [lastOnboardedContacts, setLastOnboardedContacts] = useState<any[]>([]); // Store onboarding contacts



  // New states for filtering and sorting
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('name-asc');
  const [contactLastMessageMap, setContactLastMessageMap] = useState<Map<string, Date>>(new Map());
  const [showFilters, setShowFilters] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastToastFileCountRef = useRef(0);
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

  const messagesCollection = collection(db, "messages");
  const contactsCollection = collection(db, "contacts");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("Gmail");
  const [contactsLoading, setContactsLoading] = useState(true);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Load contacts in real-time using onSnapshot when currentUser is available
  useEffect(() => {
    let unsubscribeContacts: () => void;
    if (currentUser) {
      setContactsLoading(true);
      console.log("Fetching contacts for userId:", currentUser.uid);
      const q = query(
        contactsCollection,
        where("userId", "==", currentUser.uid),
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
  }, [currentUser]);


  // NEW: useEffect to handle onboarding status and Gmail auth redirects
  useEffect(() => {
    const checkOnboardingStatusAndGmailAuth = async () => {
      if (!currentUser || !currentUser.uid) {
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const gmailAuthSuccess = urlParams.get('gmailAuth') === 'success';

      if (gmailAuthSuccess) {
        toast.success("Gmail connected successfully!");

        // Trigger import if user just authenticated Gmail during onboarding AND
        // contacts were successfully added and stored in lastOnboardedContacts
        if (isNew && lastOnboardedContacts.length > 0 && currentUser) {
          console.log("useEffect: Gmail auth success detected for new user. Triggering import.");
          await triggerGmailImport(currentUser.uid, lastOnboardedContacts);
        }

        const searchParams = useSearchParams();
const router = useRouter();

useEffect(() => {
  const checkRedirect = async () => {
    const success = searchParams.get("gmailAuth") === "success";
    const user = auth.currentUser;

    if (success && user) {
      const alreadyOnboarded = await checkIfUserIsNew(user.uid);
      if (!alreadyOnboarded && lastOnboardedContacts.length > 0) {
        await triggerGmailImport(lastOnboardedContacts);
        router.replace("/dashboard"); // optional: clean up query params
      }
    }
  };

  checkRedirect();
}, [searchParams, lastOnboardedContacts]);

        // Clean up the URL parameter to prevent re-triggering on future refreshes
        history.replaceState({}, document.title, window.location.pathname);
      }
    };

    // Only run this effect after currentUser is loaded and available
    if (currentUser) {
      checkOnboardingStatusAndGmailAuth();
    }
  }, [currentUser, lastOnboardedContacts]); // Add lastOnboardedContacts to dependency array


  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;

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
  }, [currentUser, loadingAuth]);


  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
      let unsubscribeAllMessages: () => void;
      if (currentUser) {
          const qAllMessages = query(
              messagesCollection,
              where("userId", "==", currentUser.uid),
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
          });
      } else {
          setContactLastMessageMap(new Map());
      }
      return () => {
          if (unsubscribeAllMessages) {
              unsubscribeAllMessages();
          }
      };
  }, [currentUser]);

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
            attachments: data.attachments || [],
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
    if (selectedFiles.length > lastToastFileCountRef.current) {
      const newlyAddedCount = selectedFiles.length - lastToastFileCountRef.current;
      if (newlyAddedCount > 0) {
        toast.success(`Selected ${newlyAddedCount} file(s).`);
      }
    }
    lastToastFileCountRef.current = selectedFiles.length;
  }, [selectedFiles]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

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
    if (!input.trim() && selectedFiles.length === 0 || !selectedContact || !currentUser) return;

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
      await addDoc(messagesCollection, {
        ...newMessage,
        createdAt: newMessage.createdAt,
      });
      setInput("");
      setSelectedFiles([]);
    } catch (error: any) {
      toast.error(`Failed to send message: ${error.message}`);
      console.error("Error sending message:", error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);

      setSelectedFiles((prevFiles) => {
        const uniqueNewFiles = newFiles.filter(
          (newFile) => !prevFiles.some((prevFile) => prevFile.name === newFile.name && prevFile.size === newFile.size)
        );
        return [...prevFiles, ...uniqueNewFiles];
      });
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

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F2F0]">
        <p className="text-[#332B42] text-lg font-playfair">Please log in to access the dashboard.</p>
      </div>
    );
  }

  console.log("App/page.tsx: Passing userName to TopNav:", userName);
  console.log("App/page.tsx: Passing userId to TopNav:", currentUser?.uid || null);

  return (
    <>
      <TopNav
        userName={userName}
        userId={currentUser.uid}
        weddingDate={weddingDate}
        daysLeft={daysLeft}
        onAddContact={() => setIsAdding(true)}
        showOnboardingModal={showOnboardingModal} // Pass showOnboardingModal state
        setShowOnboardingModal={setShowOnboardingModal} // Pass setter for OnboardingModal
      />

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-64px)]"> {/* Adjusted height to account for TopNav */}
        {/* Contact List (Left Section) */}
        <div className="w-1/3 bg-[#F3F2F0] border-r border-[#AB9C95] flex flex-col min-w-[300px] max-w-[400px]">
          {/* Search Bar and Filters */}
          <div className="p-4 bg-[#F3F2F0] border-b border-[#AB9C95] flex flex-col">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border border-[#AB9C95] rounded-md bg-white text-[#332B42] placeholder-[#AB9C95] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
            />
            <div className="flex justify-between items-center mt-3 relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center gap-2"
              >
                <Filter size={18} /> Filters
              </button>
              <SelectField
                label="Sort by:"
                id="sortOption"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                options={[
                  { value: 'name-asc', label: 'Name (A-Z)' },
                  { value: 'name-desc', label: 'Name (Z-A)' },
                  { value: 'recent-desc', label: 'Most Recent Message' },
                ]}
                className="w-auto ml-auto" // Adjust width for smaller size
                labelClassName="sr-only" // Hide label for compactness
              />

              {showFilters && (
                <div ref={filterPopoverRef} className="absolute top-full left-0 mt-2 bg-white border border-[#AB9C95] rounded-md shadow-lg p-4 z-20 w-64">
                  <h4 className="font-semibold text-[#332B42] mb-2">Filter by Category</h4>
                  <div className="space-y-2">
                    {allCategories.map(category => (
                      <label key={category} className="flex items-center text-[#332B42]">
                        <input
                          type="checkbox"
                          checked={selectedCategoryFilter.includes(category)}
                          onChange={() => handleCategoryChange(category)}
                          className="mr-2 accent-[#A85C36]"
                        />
                        {category}
                      </label>
                    ))}
                  </div>
                  {selectedCategoryFilter.length > 0 && (
                    <button onClick={handleClearAllCategoryFilters} className="text-sm text-red-500 mt-3 hover:underline">Clear All Filters</button>
                  )}
                </div>
              )}
            </div>
            {/* Display active filters as pills */}
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedCategoryFilter.map(category => (
                <CategoryPill
                  key={`filter-${category}`}
                  category={category}
                  onRemove={() => handleClearCategoryFilter(category)}
                  removable // Indicate that it's removable
                />
              ))}
              {sortOption !== 'name-asc' && ( // Only show clear pill if not default sort
                <span className="flex items-center text-sm px-3 py-1 bg-[#E0E0E0] rounded-full text-[#332B42] whitespace-nowrap">
                  Sort: {sortOption === 'name-desc' ? 'Name (Z-A)' : 'Most Recent'}
                  <X size={14} className="ml-1 cursor-pointer hover:text-red-500" onClick={handleClearSortOption} />
                </span>
              )}
            </div>
          </div>

          {/* Contact List Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {contactsLoading ? (
              <div className="p-4 text-center text-[#332B42]">Loading contacts...</div>
            ) : displayContacts.length === 0 ? (
              <div className="p-4 text-center text-[#332B42]">No contacts found.</div>
            ) : (
              displayContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`flex items-center p-4 border-b border-[#AB9C95] cursor-pointer hover:bg-[#EAE7E1] transition-colors duration-200
                    ${selectedContact?.id === contact.id ? "bg-[#EAE7E1]" : ""}`}
                  onClick={() => setSelectedContact(contact)}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold mr-3"
                    style={{ backgroundColor: contact.avatarColor }}
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#332B42]">{contact.name}</h3>
                    <p className="text-sm text-[#AB9C95]">
                      {contact.email || contact.phone || "No contact info"}
                    </p>
                  </div>
                  {contactLastMessageMap.has(contact.id) && (
                    <span className="text-xs text-[#AB9C95] ml-auto">
                      {contactLastMessageMap.get(contact.id)?.toLocaleDateString()}
                    </span>
                  )}
                  <CategoryPill category={contact.category} className="ml-3" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Panel (Right Section) */}
        {selectedContact ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Selected Contact Header */}
            <div className="p-4 border-b border-[#AB9C95] bg-[#F3F2F0] flex items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold mr-4"
                style={{ backgroundColor: selectedContact.avatarColor }}
              >
                {selectedContact.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-xl text-[#332B42]">{selectedContact.name}</h2>
                <div className="flex items-center text-sm text-[#AB9C95] mt-1">
                  {selectedContact.email && (
                    <span className="flex items-center mr-3">
                      <Mail size={16} className="mr-1" /> {selectedContact.email}
                    </span>
                  )}
                  {selectedContact.phone && (
                    <span className="flex items-center">
                      <Phone size={16} className="mr-1" /> {selectedContact.phone}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setIsEditing(true)} className="btn-secondary">
                Edit
              </button>
            </div>

            {/* Message Display Area */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center text-[#AB9C95] italic mt-10">
                  No messages yet. Start a conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex mb-4 ${
                      msg.via === "internal" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        msg.via === "internal"
                          ? "bg-[#EAE7E1] text-[#332B42]"
                          : "bg-[#A85C36] text-white"
                      }`}
                    >
                      <p>{msg.body}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 text-xs">
                          {msg.attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center text-gray-600">
                              <File size={14} className="mr-1" /> {attachment.name}
                            </div>
                          ))}
                        </div>
                      )}
                      <span className="block text-xs mt-1 opacity-75 text-right">
                        {msg.timestamp} ({msg.via})
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} /> {/* Scroll target */}
            </div>

            {/* Message Input Area */}
            <div className="p-4 border-t border-[#AB9C95] bg-[#F3F2F0]">
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 border border-dashed border-[#AB9C95] rounded-md bg-white">
                  {selectedFiles.map((file, index) => (
                    <span key={index} className="flex items-center text-sm bg-gray-200 px-2 py-1 rounded-full">
                      {file.name}
                      <X size={14} className="ml-1 cursor-pointer text-gray-500 hover:text-red-500" onClick={() => handleRemoveFile(file)} />
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-end space-x-2">
                {/* File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple // Allow multiple file selection
                  onChange={handleFileChange}
                  className="hidden" // Hide the default file input
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-[#A85C36] hover:bg-[#EAE7E1] rounded-full transition-colors"
                  title="Attach files"
                >
                  <FileUp size={20} />
                </button>

                {/* Emoji Picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-[#A85C36] hover:bg-[#EAE7E1] rounded-full transition-colors"
                    title="Insert emoji"
                  >
                    <SmilePlus size={20} />
                  </button>
                  {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 z-30">
                      {/* Using an external emoji picker library would be best here. */}
                      {/* For a simple example, you could list a few emojis directly */}
                      <div className="bg-white p-2 rounded-md shadow-lg grid grid-cols-5 gap-1">
                        {['😊', '😂', '👍', '❤️', '🎉', '🌟', '🥳', '🙌', '🙏', '💯'].map((emoji) => (
                          <span
                            key={emoji}
                            className="cursor-pointer text-xl hover:bg-gray-100 p-1 rounded"
                            onClick={() => handleEmojiSelect(emoji)}
                          >
                            {emoji}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border border-[#AB9C95] rounded-md bg-white text-[#332B42] resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  onClick={handleSend}
                  className="btn-primary p-3" // Adjusted padding
                >
                  <MoveRight size={20} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white text-[#AB9C95] text-lg">
            Select a contact to start messaging
          </div>
        )}
      </div>

      {/* Modals */}
      {isAdding && currentUser && (
        <AddContactModal
          userId={currentUser.uid}
          onClose={() => setIsAdding(false)}
          onContactAdded={(newContact) => {
            // Firestore listener will automatically update contacts state
            setSelectedContact(newContact);
            setIsAdding(false);
          }}
        />
      )}
      {isEditing && selectedContact && currentUser && (
        <EditContactModal
          contact={selectedContact}
          userId={currentUser.uid}
          onClose={() => setIsEditing(false)}
          onContactUpdated={(updatedContact) => {
            // Firestore listener will automatically update contacts state
            setSelectedContact(updatedContact);
            setIsEditing(false);
          }}
          onContactDeleted={() => {
            // Firestore listener will automatically update contacts state
            setSelectedContact(null);
            setIsEditing(false);
          }}
        />
      )}
      {/* Onboarding Modal */}
      {showOnboardingModal && currentUser && (
        <OnboardingModal
          userId={currentUser.uid}
          onClose={() => setShowOnboardingModal(false)}
          onComplete={async (newlyAddedContacts, selectedChannels) => {
            console.log("Dashboard: Onboarding complete. Newly added contacts:", newlyAddedContacts);
            console.log("Dashboard: selectedChannels received from OnboardingModal:", selectedChannels);

            // Store the newly added contacts to be accessible by the useEffect
            setLastOnboardedContacts(newlyAddedContacts); // THIS LINE IS CRUCIAL FOR THE USEEFFECT

            if (newlyAddedContacts.length > 0) {
              setSelectedContact(newlyAddedContacts[0]);
            }
            setShowOnboardingModal(false);

            // --- UPDATED BLOCK: Trigger Gmail import via reusable function ---
            if (selectedChannels.includes('Gmail') && currentUser) { // Ensure currentUser exists
              console.log("OnboardingModal: OnComplete triggered. Calling triggerGmailImport.");
              await triggerGmailImport(currentUser.uid, newlyAddedContacts);
            }
            // --- END UPDATED BLOCK ---
          }}
        />
      )}
    </>
  );
}