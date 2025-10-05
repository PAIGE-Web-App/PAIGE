// app/messages/page.tsx
"use client";
import { getAuth, onAuthStateChanged, User, signInWithCustomToken, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, addDoc, writeBatch, collection, query, where, orderBy, onSnapshot, limit, getDocs } from "firebase/firestore";
import Fuse from "fuse.js";
import { useEffect, useRef, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { v4 as uuidv4 } from "uuid";
import { saveContactToFirestore } from "../../lib/saveContactToFirestore";
import { useDraftMessage } from "../../hooks/useDraftMessage";
import { getCategoryStyle } from "../../utils/categoryStyle";
import { db, getUserCollectionRef } from "../../lib/firebase";
import { useCustomToast } from "@/hooks/useCustomToast";
import { useTodoLists } from "@/hooks/useTodoLists";
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
import GlobalGmailBanner from "../../components/GlobalGmailBanner";
// GmailReauthBanner now handled globally in layout.tsx
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
  const { user, userName } = useAuth();
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
  // Removed onboardingCheckLoading - using progressive loading
  
  // Refs for DOM elements
  const filterPopoverRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  
  // Hooks
  const { draft, loading: draftLoading, generateDraft: generateDraftMessage } = useDraftMessage();
  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();
  
  // Use the shared todo lists hook
  const todoListsHook = useTodoLists();
  const { handleAddList } = todoListsHook;
  
  
  // Import the same template selection logic from todo page
  const [isGeneratingDeadlines, setIsGeneratingDeadlines] = useState(false);
  const [deadlineGenerationProgress, setDeadlineGenerationProgress] = useState<{
    current: number;
    total: number;
    currentItem: string;
  } | null>(null);

  // Get wedding date for AI deadline generation
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  
  useEffect(() => {
    if (user?.uid) {
      const fetchWeddingDate = async () => {
        try {
          const userProfile = await getDoc(doc(db, 'users', user.uid));
          const weddingDateData = userProfile.data()?.weddingDate?.toDate();
          setWeddingDate(weddingDateData || null);
        } catch (error) {
          console.error('Error fetching wedding date:', error);
        }
      };
      fetchWeddingDate();
    }
  }, [user?.uid]);

  // Handler for template selection - exact same as todo page
  const handleTemplateSelection = async (template: any, allowAIDeadlines: boolean = false) => {
    try {
      // Convert template tasks to the format expected by handleAddList
      const tasks = template.tasks.map((task: any, index: number) => {
        // Handle both old string format and new object format
        const taskName = typeof task === 'string' ? task : task.name;
        const taskNote = typeof task === 'string' ? '' : (task.note || '');
        
        // Determine planning phase based on task content and position
        let planningPhase = 'Later'; // default
        
        if (template.id === 'venue-selection') {
          // Map venue selection tasks to planning phases
          if (index < 6) planningPhase = 'Discover & Shortlist';
          else if (index < 8) planningPhase = 'Inquire (from your Shortlist)';
          else if (index < 14) planningPhase = 'Tour Like a Pro';
          else planningPhase = 'Lock It In';
        } else if (template.id === 'full-wedding-planning') {
          // Map tasks to planning phases based on their position in the comprehensive list
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
          // For other templates, use a generic planning phase
          planningPhase = 'Planning Phase';
        }

        return {
          _id: `temp-id-${Date.now()}-${index}`,
          name: taskName,
          note: taskNote,
          category: null, // No default category for template items
          deadline: null,
          endDate: null,
          planningPhase: planningPhase,
          allowAIDeadlines: allowAIDeadlines
        };
      });

      // If AI deadlines are enabled and user has a wedding date, generate AI deadlines
      if (allowAIDeadlines && weddingDate && user?.uid) {
        
        // Declare progress interval outside try block for error handling
        let progressInterval: NodeJS.Timeout | null = null;
        
        try {
          // Start progress tracking
          setIsGeneratingDeadlines(true);
          setDeadlineGenerationProgress({
            current: 0,
            total: tasks.length,
            currentItem: 'Initializing AI deadline generation...'
          });
          
          // Simulate progress updates
          progressInterval = setInterval(() => {
            setDeadlineGenerationProgress(prev => {
              if (!prev) return null;
              const newCurrent = Math.min(prev.current + 1, prev.total - 1);
              const messages = [
                'Analyzing wedding timeline...',
                'Calculating optimal deadlines...',
                'Prioritizing critical tasks...',
                'Generating intelligent schedules...',
                'Finalizing deadline assignments...'
              ];
              return {
                ...prev,
                current: newCurrent,
                currentItem: messages[Math.floor((newCurrent / prev.total) * messages.length)] || 'Processing...'
              };
            });
          }, 800);

          const response = await fetch('/api/generate-todo-deadlines', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              todos: tasks,
              weddingDate: weddingDate,
              userId: user.uid,
              userEmail: user.email,
              listName: template.name
            }),
          });

          // Clear progress interval
          if (progressInterval) clearInterval(progressInterval);

          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 402) {
              // Insufficient credits
              showInfoToast(errorData.message || 'Insufficient credits for AI deadline generation');
              // Continue with template creation without AI deadlines
            } else {
              throw new Error(errorData.message || 'Failed to generate AI deadlines');
            }
          } else {
            const result = await response.json();
            
            if (result.success && result.todos) {
              // Use AI-generated deadlines
              const tasksWithDeadlines = result.todos.map((todo: any) => ({
                ...todo,
                deadline: todo.deadline ? new Date(todo.deadline) : null,
                endDate: todo.endDate ? new Date(todo.endDate) : null
              }));
              
              // Update progress to completion
              setDeadlineGenerationProgress({
                current: tasks.length,
                total: tasks.length,
                currentItem: 'Creating todo list with AI deadlines...'
              });
              
              // Create the list with AI-generated deadlines
              await handleAddList(template.name, tasksWithDeadlines);
              
              // Close progress modal
              setIsGeneratingDeadlines(false);
              setDeadlineGenerationProgress(null);
              
              showSuccessToast('Todo list created with AI-powered deadlines!');
            } else {
              throw new Error('Invalid response from AI deadline generation');
            }
          }
        } catch (aiError) {
          console.error('AI deadline generation failed:', aiError);
          
          // Clear any remaining progress interval
          if (progressInterval) clearInterval(progressInterval);
          
          // Close progress modal
          setIsGeneratingDeadlines(false);
          setDeadlineGenerationProgress(null);
          
          showInfoToast('AI deadline generation failed. Creating list with template deadlines.');
          // Fall back to creating list without AI deadlines
          await handleAddList(template.name, tasks);
          showCompletionToast('todos');
        }
      } else {
        // Create the list with template tasks (no AI deadlines)
        await handleAddList(template.name, tasks);
        showCompletionToast('todos');
      }
    } catch (error) {
      console.error('Error creating list from template:', error);
      showInfoToast('Failed to create list from template. Please try again.');
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use centralized WeddingBanner hook
  
  // Use notifications hook for unread message counts
  const { contactUnreadCounts } = useNotifications();

  // Gmail authentication status now checked globally in GmailAuthContext

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
  
  // Gmail authentication now handled globally in GmailAuthContext
  
  
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

  // Gmail authentication status now checked globally in GmailAuthContext

  // Removed problematic effect that was causing redirect loops
  // Authentication is now handled by middleware and AuthContext

  // Simplified onboarding check - use cached status from localStorage
  useEffect(() => {
    if (user) {
      const cachedOnboardingStatus = localStorage.getItem('paige_onboarding_status');
      if (cachedOnboardingStatus === 'not-onboarded') {
        console.log('User is not onboarded, redirecting to signup...');
        router.push('/signup?onboarding=1');
      }
    }
  }, [user, router]);

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
        if (!user) {
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
  }, [user]);

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
  const isPageLoading = !minLoadTimeReached;


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

      
      // Gmail reauth banner now handled globally
      
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
        {/* Loading is now handled by LoadingProvider in layout.tsx */}
        <WeddingBanner />
        
        {/* Global Gmail Banner - positioned after WeddingBanner */}
        <GlobalGmailBanner />

          <div className="app-content-container flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Gmail Re-authentication Banner now handled globally in layout.tsx */}

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

            {user ? (
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
                  
                  // Use the exact same template selection logic as todo page
                  await handleTemplateSelection(template, allowAIDeadlines);
                }}
                onCreateWithAI={() => {
                  // Redirect to todo page for AI creation
                  router.push('/todo');
                }}
              />
            </Suspense>
          )}

          {/* AI Deadline Generation Progress Modal */}
          {isGeneratingDeadlines && deadlineGenerationProgress && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating AI Deadlines</h3>
                    <p className="text-sm text-gray-600 mb-4">{deadlineGenerationProgress.currentItem}</p>
                  </div>
                  
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ 
                          width: `${(deadlineGenerationProgress.current / deadlineGenerationProgress.total) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {deadlineGenerationProgress.current} of {deadlineGenerationProgress.total} tasks processed
                    </p>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    This may take a few moments while Paige analyzes your wedding timeline...
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Not Enough Credits Modal */}
          {showNotEnoughCreditsModal && (
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
          )}
      </div>
  );
}
