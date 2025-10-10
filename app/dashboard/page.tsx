// app/page.tsx - New Dashboard Page
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/contexts/AuthContext';
import ClientOnly from '../../components/ClientOnly';
import AuthGuard from '../../components/AuthGuard';
import WeddingBanner from "../../components/WeddingBanner";
import GlobalGmailBanner from "../../components/GlobalGmailBanner";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useCustomToast } from "../../hooks/useCustomToast";
import { useGlobalCompletionToasts } from "../../hooks/useGlobalCompletionToasts";
import { useQuickStartCompletion } from "../../hooks/useQuickStartCompletion";
import toast from "react-hot-toast";
import confetti from 'canvas-confetti';
import { doc, getDoc, collection, getDocs, query, limit, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ProgressItem } from "../../types/seatingChart";
import { CheckCircle, Circle, Users, Heart, ClipboardList, Palette, DollarSign, Calendar, MessageSquare, Sparkles, ArrowRight, ChevronDown, ChevronUp, MapPin, Home, Star, FileText, Bot } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import CreditsExplanationModal from "../../components/CreditsExplanationModal";
import WelcomeModal from "../../components/WelcomeModal";
import AIGenerationModal from "../../components/onboarding/AIGenerationModal";
import { 
  QuickGuide, 
  QuickGuideCards,
  QuickActions, 
  ProgressOverview, 
  ProgressAccordion 
} from "../../components/dashboard";


export default function Dashboard() {
  const { user, userName, loading } = useAuth();
  const router = useRouter();
  
  // Track Quick Start Guide completion
  useQuickStartCompletion();
  // Removed onboardingCheckLoading - using progressive loading
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [userData, setUserData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [jiggleFields, setJiggleFields] = useState<Set<string>>(new Set());
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [previousCompletedItems, setPreviousCompletedItems] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [progressLoading, setProgressLoading] = useState(true);
  const [creditsCompleted, setCreditsCompleted] = useState(false);
  const [aiCompleted, setAiCompleted] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isManualWelcomeModal, setIsManualWelcomeModal] = useState(false);
  const [showAIGenerationModal, setShowAIGenerationModal] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);

  const { showInfoToast, showSuccessToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();
  
  // Helper function to extract first name from full name
  const getFirstName = (fullName: string | null | undefined): string => {
    if (!fullName) return 'there';
    const nameParts = fullName.trim().split(' ');
    return nameParts[0] || 'there';
  };
  
  // Fetch user data and progress information
  const fetchUserData = async () => {
    if (!user) return;
    
    setProgressLoading(true);
    try {
      // Fetch user profile data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserData(userData);
        
        // Check progress data
        const progressChecks = await checkProgressData(user.uid, userData);
        setProgressData(progressChecks);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  // Listen for user profile refresh events
  useEffect(() => {
    const handleRefreshUserProfile = () => {
      console.log('🔄 Dashboard refreshing user data due to profile update');
      fetchUserData();
    };

    window.addEventListener('refreshUserProfile', handleRefreshUserProfile);
    return () => window.removeEventListener('refreshUserProfile', handleRefreshUserProfile);
  }, [user]);

  // Refresh progress data when page becomes visible (e.g., when navigating back from other pages)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Page became visible, refresh progress data
        const refreshProgress = async () => {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const progressChecks = await checkProgressData(user.uid, userData);
              setProgressData(progressChecks);
            }
          } catch (error) {
            console.error('Error refreshing progress data:', error);
          }
        };
        refreshProgress();
      }
    };

    const handleFocus = () => {
      if (user) {
        // Window gained focus, refresh progress data
        const refreshProgress = async () => {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const progressChecks = await checkProgressData(user.uid, userData);
              setProgressData(progressChecks);
      }
    } catch (error) {
            console.error('Error refreshing progress data:', error);
          }
        };
        refreshProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  // Check progress data for all items - optimized with batched queries
  const checkProgressData = async (userId: string, userData: any) => {
    const checks: any = {};
    
    try {
      // Batch all Firestore queries in parallel with limit(1) for existence checks
      const [contacts, todos, budget, seating, files, vendors] = await Promise.all([
        getDocs(query(collection(db, 'users', userId, 'contacts'), limit(1))),
        getDocs(query(collection(db, 'users', userId, 'todoLists'), limit(1))),
        getDocs(query(collection(db, 'users', userId, 'budgetCategories'), limit(1))),
        getDocs(query(collection(db, 'users', userId, 'seatingCharts'), limit(1))),
        getDocs(query(collection(db, 'users', userId, 'files'), limit(1))),
        getDocs(query(collection(db, 'users', userId, 'vendors'), limit(1)))
      ]);
      
      // Process results
      checks.hasContacts = contacts.size > 0;
      checks.hasTodos = todos.size > 0;
      checks.hasBudget = budget.size > 0;
      checks.hasSeatingCharts = seating.size > 0;
      checks.hasVisitedFiles = files.size > 0;
      checks.hasVendors = vendors.size > 0;
      
      
      // Check moodboards (no Firestore query needed - uses userData)
      checks.hasMoodboards = (userData.moodBoards && userData.moodBoards.length > 0) || 
                            (userData.vibe && userData.vibe.length > 0);
      
      // Check AI functions usage (no Firestore query needed - uses userData)
      checks.hasUsedAI = userData.aiFunctionsUsed || false;
      
    } catch (error) {
      console.error('Error checking progress data:', error);
    }
    
    return checks;
  };

  // Toggle accordion item
  const toggleAccordion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle jiggle effect for settings page fields
  const handleJiggleEffect = (fieldName: string) => {
    setJiggleFields(prev => new Set(prev).add(fieldName));
      setTimeout(() => {
      setJiggleFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
    }, 700); // Match the jiggle animation duration
  };

  const handleJiggleAndNavigate = (url: string, fieldId: string) => {
    // Navigate to the URL with highlight parameter (settings page uses 'highlight' not 'jiggle')
    router.push(`${url}&highlight=${fieldId}`);
  };

  const handleMoodboardClick = () => {
    // Navigate to moodboards page
    router.push('/moodboards');
    
    // Dispatch custom event to trigger new board modal
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-new-board-modal'));
    }, 1000); // Delay to ensure page loads
  };


  // Handle progress item click with jiggle effect
  const handleProgressItemClick = (item: ProgressItem) => {
    if (item.customHandler) {
      // Use custom handler
      item.customHandler();
    } else if (item.jiggleField) {
      // Use the new jiggle and navigate function
      handleJiggleAndNavigate(item.link, item.jiggleField);
    } else {
      // Regular navigation
      router.push(item.link);
    }
  };

  // Simplified onboarding check - use cached status from localStorage
  useEffect(() => {
    if (user) {
      const cachedOnboardingStatus = localStorage.getItem('paige_onboarding_status');
      const aiGenerationContext = localStorage.getItem('paige_ai_generation_context');
      
      // Don't redirect if user is coming from signup with AI generation context
      if (cachedOnboardingStatus === 'not-onboarded' && !aiGenerationContext) {
        console.log('User is not onboarded, redirecting to signup...');
        window.location.href = '/signup?onboarding=1';
      }
    }
  }, [user]);

  // Check localStorage for completion status
  useEffect(() => {
    const aiCompletedFromStorage = localStorage.getItem('paige-ai-completed') === 'true';
    if (aiCompletedFromStorage) {
      setAiCompleted(true);
    }
    
    const creditsCompletedFromStorage = localStorage.getItem('credits-completed') === 'true';
    if (creditsCompletedFromStorage) {
      setCreditsCompleted(true);
    }
  }, []);

  // Show a welcome toast if the user just logged in (one-time, using localStorage flag)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('showLoginToast') === '1') {
        showSuccessToast('Login successful, welcome back!');
        localStorage.removeItem('showLoginToast');
      }
    }
  }, [showSuccessToast]);

  // Check for AI generation context from signup flow
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const aiGenerationContext = localStorage.getItem('paige_ai_generation_context');
      const enhancedOnboardingActive = localStorage.getItem('paige_enhanced_onboarding_active');
      // Check AI generation status
      
      if (aiGenerationContext && userData) {
        // Clear the context from localStorage
        localStorage.removeItem('paige_ai_generation_context');
        // Show AI generation modal
        setShowAIGenerationModal(true);
      } else if (enhancedOnboardingActive === 'true' && userData) {
        // Resume enhanced onboarding flow
        // Clear old cached data and force fresh generation
        localStorage.removeItem('paige_generated_data');
        // Force fresh data generation
        setShowAIGenerationModal(true);
      }
    }
  }, [userData, loading]);

  // Show welcome modal for first-time users
  useEffect(() => {
    if (userData && !loading) {
      // Check if user has seen the welcome modal before (from Firestore)
      const hasSeenWelcomeModal = userData.hasSeenWelcomeModal;
      const aiGenerationContext = localStorage.getItem('paige_ai_generation_context');
      
      // Check welcome modal status
      
      // Show welcome modal for ALL new users who haven't seen it before
      // BUT only if they're not coming from the AI generation flow or enhanced onboarding
      const enhancedOnboardingActive = localStorage.getItem('paige_enhanced_onboarding_active');
      const showWelcomeModalFlag = localStorage.getItem('paige_show_welcome_modal');
      
      if ((!hasSeenWelcomeModal && !aiGenerationContext && enhancedOnboardingActive !== 'true') || showWelcomeModalFlag === 'true') {
        console.log('Showing welcome modal automatically for new user or after onboarding completion');
        setShowWelcomeModal(true);
        setIsManualWelcomeModal(false); // This is automatic, not manual
        
        // Clear the flag after showing the modal
        if (showWelcomeModalFlag === 'true') {
          localStorage.removeItem('paige_show_welcome_modal');
          
          // Trigger confetti effect for onboarding completion
          setTimeout(() => {
            // Single confetti burst for celebration
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }, 500); // Delay to let modal appear first
        }
      }
    }
  }, [userData, loading]);

  // Initialize progress items based on user data and progress checks
  useEffect(() => {
    if (userData && progressData) {
      const items: ProgressItem[] = [
        {
          id: 'wedding-date',
          title: 'Set your wedding date',
          description: 'Choose your special day to get personalized planning recommendations and timeline guidance.',
          completed: !!userData.weddingDate,
          link: '/settings?tab=wedding',
          icon: <Calendar className="w-5 h-5" />,
          category: 'profile',
          actionText: userData.weddingDate ? 'Update your wedding date' : 'Set your wedding date',
          jiggleField: 'weddingDate',
          scrollToField: 'weddingDate'
        },
        {
          id: 'wedding-destination',
          title: 'Choose your wedding destination',
          description: 'Select your wedding city to discover local vendors and venues in your area.',
          completed: !!userData.weddingLocation,
          link: '/settings?tab=wedding',
          icon: <MapPin className="w-5 h-5" />,
          category: 'destination',
          actionText: userData.weddingLocation ? 'Update your wedding destination' : 'Choose your wedding destination',
          jiggleField: 'weddingLocation',
          scrollToField: 'weddingLocation'
        },
        {
          id: 'venue',
          title: 'Pick out your main venue',
          description: 'Select your wedding venue to finalize your location and start detailed planning.',
          completed: !!userData.hasVenue,
          link: '/settings?tab=wedding',
          icon: <Home className="w-5 h-5" />,
          category: 'venue',
          actionText: userData.hasVenue ? 'Update your venue' : 'Pick out your main venue'
        },
        {
          id: 'vibes',
          title: 'The vibes/mood of the big day',
          description: 'Define your wedding style and aesthetic to get personalized recommendations.',
          completed: progressData.hasMoodboards,
          link: '/moodboards/wedding-day',
          icon: <Star className="w-5 h-5" />,
          category: 'moodboard',
          actionText: progressData.hasMoodboards ? 'Update your wedding vibes' : 'Define your wedding vibes'
        },
        {
          id: 'vendors',
          title: 'Explore vendors',
          description: 'Discover and connect with wedding vendors that match your style and budget.',
          completed: progressData.hasVendors,
          link: '/vendors',
          icon: <Users className="w-5 h-5" />,
          category: 'contacts',
          actionText: progressData.hasVendors ? 'Explore more vendors' : 'Start exploring vendors'
        },
        {
          id: 'contacts',
          title: 'Add contacts',
          description: 'Import your vendor contacts to start managing all communications in one place.',
          completed: progressData.hasContacts,
          link: '/messages',
          icon: <MessageSquare className="w-5 h-5" />,
          category: 'contacts',
          actionText: progressData.hasContacts ? 'Manage contacts' : 'Add contacts',
          customHandler: () => {
            // Navigate to messages page and trigger onboarding modal
            router.push('/messages?onboarding=true');
          }
        },
        {
          id: 'budget',
          title: 'Plan your budget',
          description: 'Create a realistic budget and track expenses to stay financially organized.',
          completed: progressData.hasBudget,
          link: '/budget',
          icon: <DollarSign className="w-5 h-5" />,
          category: 'budget',
          actionText: progressData.hasBudget ? 'Update your budget' : 'Create your budget'
        },
        {
          id: 'todos',
          title: 'Create your todos',
          description: 'Organize your wedding tasks and deadlines. Feeling overwhelmed? Let Paige create a personalized todo list for you!',
          completed: progressData.hasTodos,
          link: progressData.hasTodos ? '/todo' : '/todo?new-list=true',
          icon: <ClipboardList className="w-5 h-5" />,
          category: 'todo',
          actionText: progressData.hasTodos ? 'Manage your todos' : 'Create your first todo list'
        },
        {
          id: 'moodboard',
          title: 'Create a moodboard',
          description: 'Visualize your wedding style with inspiration boards. Need help? Paige can create one based on your preferences!',
          completed: progressData.hasMoodboards,
          link: '/moodboards',
          icon: <Palette className="w-5 h-5" />,
          category: 'moodboard',
          actionText: progressData.hasMoodboards ? 'Update moodboards' : 'Create moodboard',
          customHandler: handleMoodboardClick
        },
        {
          id: 'seating-chart',
          title: 'Create your seating chart',
          description: 'Plan your reception seating arrangement. Let Paige help you organize your guests perfectly!',
          completed: progressData.hasSeatingCharts,
          link: '/seating-charts',
          icon: <Users className="w-5 h-5" />,
          category: 'seating',
          actionText: progressData.hasSeatingCharts ? 'Manage your seating charts' : 'Create your first seating chart'
        },
        {
          id: 'files',
          title: 'Files and contracts',
          description: 'Upload and organize your wedding contracts, invoices, and important documents.',
          completed: progressData.hasVisitedFiles,
          link: '/files',
          icon: <FileText className="w-5 h-5" />,
          category: 'files',
          actionText: progressData.hasVisitedFiles ? 'Manage your files' : 'Upload your first file'
        },
        {
          id: 'paige-ai',
          title: 'Bonus! Paige AI functions',
          description: 'Explore all of Paige\'s AI-powered features to make your wedding planning effortless and personalized.',
          completed: progressData.hasUsedAI || aiCompleted,
          link: '/settings?tab=credits',
          icon: <Bot className="w-5 h-5" />,
          category: 'ai',
          actionText: (progressData.hasUsedAI || aiCompleted) ? 'Try more AI features' : 'Discover Paige AI',
          customHandler: () => {
            router.push('/settings?tab=credits');
            // Scroll to AI Features section after a brief delay
            setTimeout(() => {
              const element = document.getElementById('ai-features-section');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              } else {
                setTimeout(() => {
                  const retryElement = document.getElementById('ai-features-section');
                  if (retryElement) {
                    retryElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 1000);
              }
            }, 500);
          }
        },
        {
          id: 'credits',
          title: 'Understand how Credits work',
          description: 'Learn about your daily credit refresh, membership tier benefits, and how to earn bonus credits.',
          completed: creditsCompleted,
          link: '#',
          icon: <Sparkles className="w-5 h-5" />,
          category: 'credits',
          actionText: 'Learn More',
          customHandler: () => setShowCreditsModal(true)
        }
      ];
      
      setProgressItems(items);
      const newCompletedCount = items.filter(item => item.completed).length;
      setCompletedCount(newCompletedCount);
      
      // Check for newly completed items and show toasts (only after initial load)
      const currentCompletedItems = new Set(items.filter(item => item.completed).map(item => item.id));
      
      if (hasInitialized) {
        const newlyCompleted = Array.from(currentCompletedItems).filter(itemId => !previousCompletedItems.has(itemId));
        
        // Show completion toasts for newly completed items
        newlyCompleted.forEach((itemId, index) => {
          setTimeout(() => showCompletionToast(itemId), 500 + (index * 200)); // Stagger toasts for multiple completions
        });
        
        // Special toast for completing all items
        if (newCompletedCount === items.length && items.length > 0 && previousCompletedItems.size < items.length) {
          setTimeout(() => {
            showInfoToast('🎊 INCREDIBLE! You\'ve completed your entire wedding planning setup! You\'re ready to plan the perfect wedding!');
          }, 1000);
              }
    } else {
        // Mark as initialized after first load
        setHasInitialized(true);
      }
      
      // Update previous completed items
      setPreviousCompletedItems(currentCompletedItems);
      
      // Expand first 3 incomplete items by default to show users what's available
      const incompleteItems = items.filter(item => !item.completed);
      const itemsToExpand = incompleteItems.slice(0, 3).map(item => item.id);
      setExpandedItems(new Set(itemsToExpand));
    }
  }, [userData, progressData]);


  // Listen for completion events from other pages
  useEffect(() => {
    const handleCompletion = (event: CustomEvent) => {
      const { itemId } = event.detail;
      
      if (itemId === 'paige-ai') {
        setAiCompleted(true);
        // Also store in localStorage for persistence
        localStorage.setItem('paige-ai-completed', 'true');
      }
      
      // Update the specific item
      setProgressItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, completed: true } : item
      ));
      
      // Update completed count
      setCompletedCount(prev => prev + 1);
    };

    window.addEventListener('progressItemCompleted', handleCompletion as EventListener);

    return () => {
      window.removeEventListener('progressItemCompleted', handleCompletion as EventListener);
    };
  }, []);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const progressPercentage = progressItems.length > 0 ? Math.round((completedCount / progressItems.length) * 100) : 0;

  return (
    <ClientOnly>
      <style jsx global>{`
        html, body {
          overflow-x: hidden;
          height: 100vh;
          margin: 0;
          padding: 0;
        }
        body {
          position: relative;
        }
        /* Mobile: Full height with fixed nav at bottom */
        @media (max-width: 768px) {
          html, body {
            height: 100vh;
            overflow: hidden;
          }
          .mobile-scroll-container {
            height: 100vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
        /* Desktop: Normal scrolling */
        @media (min-width: 769px) {
          html, body {
            height: auto;
            min-height: 100vh;
            overflow-y: auto;
          }
        }
      `}</style>
      <div className="min-h-screen bg-linen mobile-scroll-container">
          <WeddingBanner />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ width: '100%', maxWidth: '1152px' }}>
        <div className="space-y-8">
          
          {/* Quick Guide Cards Section */}
          <QuickGuideCards 
            userData={userData}
            progressData={progressData}
            onOpenWelcomeModal={() => {
              setShowWelcomeModal(true);
              setIsManualWelcomeModal(true);
            }}
          />

          {/* Enhanced Onboarding Trigger Button */}
          <div className="bg-white rounded-lg border border-[#AB9C95] p-6 text-center">
            <h3 className="text-lg font-semibold text-[#332B42] mb-2">Let Paige Create Your Wedding Plan</h3>
            <p className="text-sm text-gray-600 mb-4">
              Get personalized todos, budget, and vendor recommendations based on your wedding details.
            </p>
            <button
              onClick={() => {
                console.log('Starting enhanced onboarding from dashboard');
                setShowAIGenerationModal(true);
              }}
              className="btn-primary flex items-center justify-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              Create My Wedding Plan
            </button>
          </div>


              </div>
            </div>
          </div>

    {/* Credits Explanation Modal */}
    <CreditsExplanationModal
      isOpen={showCreditsModal}
      onClose={() => setShowCreditsModal(false)}
      onComplete={() => {
        setCreditsCompleted(true);
        // Store in localStorage for persistence
        localStorage.setItem('credits-completed', 'true');
        // Update the progress items array to mark credits as completed
        setProgressItems(prev => prev.map(item => 
          item.id === 'credits' ? { ...item, completed: true } : item
        ));
        // Update completed count
        setCompletedCount(prev => prev + 1);
        showCompletionToast('credits');
      }}
    />

    {/* Welcome Modal */}
    <WelcomeModal
      isOpen={showWelcomeModal}
      onClose={async () => {
        setShowWelcomeModal(false);
        // Mark as seen in Firestore so it doesn't show automatically again
        if (user?.uid) {
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              hasSeenWelcomeModal: true
            });
            console.log('Welcome modal marked as seen in Firestore');
          } catch (error) {
            console.error('Error updating welcome modal status:', error);
          }
        }
      }}
      firstName={getFirstName(userData?.userName)}
      showCloseButton={isManualWelcomeModal}
    />

    {/* AI Generation Modal */}
    <AIGenerationModal
      isOpen={showAIGenerationModal}
      onClose={() => setShowAIGenerationModal(false)}
      onComplete={(data) => {
        setShowAIGenerationModal(false);
        setGeneratedData(data);
        localStorage.setItem('paige_enhanced_onboarding_active', 'true');
        localStorage.setItem('paige_generated_data', JSON.stringify(data));
        
        // Clear updated wedding details after use
        localStorage.removeItem('paige_updated_wedding_details');
        
        showSuccessToast('Welcome to Paige! Your personalized wedding plan is ready!');
        // Set flag to prevent welcome modal during onboarding
        localStorage.setItem('paige_enhanced_onboarding_active', 'true');
        // Navigate to the new dedicated onboarding page
        router.push('/onboarding/vendors');
      }}
      userId={user?.uid || ''}
      userName={userData?.userName || ''}
      partnerName={userData?.partnerName || ''}
      weddingDate={(() => {
        // Check for updated wedding details first
        const updatedDetails = typeof window !== 'undefined' ? localStorage.getItem('paige_updated_wedding_details') : null;
        let weddingDate = userData?.weddingDate;
        
        if (updatedDetails) {
          try {
            const parsed = JSON.parse(updatedDetails);
            if (parsed.weddingDateUndecided || !parsed.weddingDate) {
              return null; // TBD or undecided
            }
            weddingDate = parsed.weddingDate;
          } catch (error) {
            console.error('Error parsing updated wedding details:', error);
          }
        }
        
        if (!weddingDate) return null;
        
        try {
          // If it's already a string, return it
          if (typeof weddingDate === 'string') {
            return weddingDate;
          }
          
          // If it's a Firestore Timestamp, convert it
          if (weddingDate && typeof weddingDate === 'object' && 'toDate' in weddingDate) {
            const date = weddingDate.toDate();
            return date.toISOString();
          }
          
          // If it's a Firestore Timestamp object (plain object with seconds/nanoseconds)
          if (weddingDate && typeof weddingDate === 'object' && 'seconds' in weddingDate) {
            const timestamp = weddingDate as { seconds: number; nanoseconds: number };
            const date = new Date(timestamp.seconds * 1000);
            return date.toISOString();
          }
          
          // If it's a Date object, convert it
          if (weddingDate instanceof Date) {
            return weddingDate.toISOString();
          }
          
          // Fallback: try to create a Date object, but check if it's valid first
          const fallbackDate = new Date(weddingDate);
          if (isNaN(fallbackDate.getTime())) {
            console.warn('Invalid wedding date:', weddingDate);
            return null;
          }
          return fallbackDate.toISOString();
        } catch (error) {
          console.error('Error converting wedding date:', error, 'Date value:', weddingDate);
          return null;
        }
      })()}
      weddingLocation={(() => {
        const updatedDetails = typeof window !== 'undefined' ? localStorage.getItem('paige_updated_wedding_details') : null;
        if (updatedDetails) {
          try {
            const parsed = JSON.parse(updatedDetails);
            return parsed.location || userData?.weddingLocation || '';
          } catch (error) {
            console.error('Error parsing updated wedding details:', error);
          }
        }
        return userData?.weddingLocation || '';
      })()}
      selectedVenueMetadata={userData?.selectedVenueMetadata || null}
      maxBudget={(() => {
        const updatedDetails = typeof window !== 'undefined' ? localStorage.getItem('paige_updated_wedding_details') : null;
        if (updatedDetails) {
          try {
            const parsed = JSON.parse(updatedDetails);
            return parsed.budgetAmount || userData?.maxBudget || 0;
          } catch (error) {
            console.error('Error parsing updated wedding details:', error);
          }
        }
        return userData?.maxBudget || 0;
      })()}
      guestCount={(() => {
        const updatedDetails = typeof window !== 'undefined' ? localStorage.getItem('paige_updated_wedding_details') : null;
        if (updatedDetails) {
          try {
            const parsed = JSON.parse(updatedDetails);
            return parsed.guestCount || userData?.guestCount || 0;
          } catch (error) {
            console.error('Error parsing updated wedding details:', error);
          }
        }
        return userData?.guestCount || 0;
      })()}
      vibe={userData?.vibe || []}
      additionalContext={typeof window !== 'undefined' ? localStorage.getItem('paige_ai_generation_context') || '' : ''}
    />

    </ClientOnly>
  );
}
