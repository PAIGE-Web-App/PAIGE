// app/page.tsx - New Dashboard Page
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/contexts/AuthContext';
import { useWeddingBanner } from "../hooks/useWeddingBanner";
import WeddingBanner from "../components/WeddingBanner";
import LoadingSpinner from "../components/LoadingSpinner";
import { useCustomToast } from "../hooks/useCustomToast";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { CheckCircle, Circle, Users, Heart, ClipboardList, Palette, DollarSign, Calendar, MessageSquare, Sparkles, ArrowRight, ChevronDown, ChevronUp, MapPin, Home, Star, FileText, Bot } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface ProgressItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  link: string;
  icon: React.ReactNode;
  category: 'profile' | 'contacts' | 'budget' | 'todo' | 'moodboard' | 'seating' | 'messages' | 'venue' | 'destination' | 'files' | 'ai';
  actionText: string;
  jiggleField?: string;
  scrollToField?: string;
}

export default function Dashboard() {
  const { user, loading: authLoading, onboardingStatus, checkOnboardingStatus } = useAuth();
  const router = useRouter();
  const [onboardingCheckLoading, setOnboardingCheckLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [userData, setUserData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [jiggleFields, setJiggleFields] = useState<Set<string>>(new Set());
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [previousCompletedItems, setPreviousCompletedItems] = useState<Set<string>>(new Set());

  // Use centralized WeddingBanner hook
  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);
  const { showInfoToast } = useCustomToast();
  
  // Fetch user data and progress information
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
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
      }
    };

    fetchUserData();
  }, [user]);

  // Check progress data for all items
  const checkProgressData = async (userId: string, userData: any) => {
    const checks: any = {};
    
    try {
      // Check contacts
      const contactsSnapshot = await getDocs(collection(db, 'users', userId, 'contacts'));
      checks.hasContacts = contactsSnapshot.size > 0;
      
      // Check todos
      const todosSnapshot = await getDocs(collection(db, 'users', userId, 'todos'));
      checks.hasTodos = todosSnapshot.size > 0;
      
      // Check budget categories
      const budgetSnapshot = await getDocs(collection(db, 'users', userId, 'budgetCategories'));
      checks.hasBudget = budgetSnapshot.size > 0;
      
      // Check moodboards
      checks.hasMoodboards = (userData.moodBoards && userData.moodBoards.length > 0) || 
                            (userData.vibe && userData.vibe.length > 0);
      
      // Check seating charts
      const seatingSnapshot = await getDocs(collection(db, 'users', userId, 'seatingCharts'));
      checks.hasSeatingCharts = seatingSnapshot.size > 0;
      
      // Check files (if user has visited files page)
      checks.hasVisitedFiles = userData.hasVisitedFiles || false;
      
      // Check AI functions usage
      checks.hasUsedAI = userData.aiFunctionsUsed || false;
      
      // Check vendors
      const vendorsSnapshot = await getDocs(collection(db, 'users', userId, 'vendors'));
      checks.hasVendors = vendorsSnapshot.size > 0;
      
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

  // Show completion toast for newly completed items
  const showCompletionToast = (itemId: string) => {
    const completionMessages: { [key: string]: string } = {
      'wedding-date': '🎉 Amazing! Your wedding date is set!',
      'wedding-destination': '🌍 Perfect! Your wedding destination is chosen!',
      'venue': '🏰 Fantastic! Your dream venue is selected!',
      'vibes': '✨ Beautiful! Your wedding vibes are defined!',
      'vendors': '🤝 Excellent! You\'ve started exploring vendors!',
      'contacts': '📞 Great! Your first contact is added!',
      'budget': '💰 Smart! Your wedding budget is planned!',
      'todos': '✅ Wonderful! Your first todo list is created!',
      'moodboard': '🎨 Stunning! Your first moodboard is ready!',
      'seating-chart': '🪑 Perfect! Your seating chart is created!',
      'files': '📁 Excellent! Your first file is uploaded!',
      'paige-ai': '🤖 Incredible! You\'ve discovered Paige\'s AI magic!'
    };

    const message = completionMessages[itemId] || '🎉 Congratulations! Another item completed!';
    showInfoToast(message);
  };

  // Handle progress item click with jiggle effect
  const handleProgressItemClick = (item: ProgressItem) => {
    if (item.jiggleField) {
      // Navigate to settings page with jiggle effect
      router.push(`${item.link}?jiggle=${item.jiggleField}`);
    } else {
      // Regular navigation
      router.push(item.link);
    }
  };

  // Check onboarding status
  useEffect(() => {
    if (!authLoading && user) {
      if (onboardingStatus === 'unknown') {
        setOnboardingCheckLoading(true);
        checkOnboardingStatus().then(() => {
          setOnboardingCheckLoading(false);
        });
      } else if (onboardingStatus === 'not-onboarded') {
        router.push('/signup?onboarding=1');
      } else {
        setOnboardingCheckLoading(false);
      }
    } else if (!authLoading && !user) {
      setOnboardingCheckLoading(false);
    }
  }, [user, authLoading, onboardingStatus, checkOnboardingStatus, router]);

  // Initialize progress items based on user data and progress checks
  useEffect(() => {
    if (userData && progressData) {
      const items: ProgressItem[] = [
        {
          id: 'wedding-date',
          title: 'Set your wedding date',
          description: 'Choose your special day to get personalized planning recommendations and timeline guidance.',
          completed: !!userData.weddingDate,
          link: '/settings',
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
          link: '/settings',
          icon: <MapPin className="w-5 h-5" />,
          category: 'destination',
          actionText: userData.weddingLocation ? 'Update your wedding destination' : 'Choose your wedding destination',
          jiggleField: 'weddingLocation',
          scrollToField: 'weddingLocation'
        },
        {
          id: 'venue',
          title: 'Pick out the venue',
          description: 'Select your wedding venue to finalize your location and start detailed planning.',
          completed: !!userData.hasVenue,
          link: '/settings',
          icon: <Home className="w-5 h-5" />,
          category: 'venue',
          actionText: userData.hasVenue ? 'Update your venue' : 'Pick out the venue',
          jiggleField: 'venue',
          scrollToField: 'venue'
        },
        {
          id: 'vibes',
          title: 'The vibes/mood of the big day',
          description: 'Define your wedding style and aesthetic to get personalized recommendations.',
          completed: progressData.hasMoodboards,
          link: '/moodboards',
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
          title: 'Add a contact(s)',
          description: 'Import your vendor contacts to start managing all communications in one place.',
          completed: progressData.hasContacts,
          link: '/messages',
          icon: <MessageSquare className="w-5 h-5" />,
          category: 'contacts',
          actionText: progressData.hasContacts ? 'Manage your contacts' : 'Add your first contact'
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
          link: '/todo',
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
          actionText: progressData.hasMoodboards ? 'Update your moodboards' : 'Create your first moodboard'
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
          completed: progressData.hasUsedAI,
          link: '/messages',
          icon: <Bot className="w-5 h-5" />,
          category: 'ai',
          actionText: progressData.hasUsedAI ? 'Try more AI features' : 'Discover Paige AI'
        }
      ];
      
      setProgressItems(items);
      const newCompletedCount = items.filter(item => item.completed).length;
      setCompletedCount(newCompletedCount);
      
      // Check for newly completed items and show toasts
      const currentCompletedItems = new Set(items.filter(item => item.completed).map(item => item.id));
      const newlyCompleted = Array.from(currentCompletedItems).filter(itemId => !previousCompletedItems.has(itemId));
      
      // Show completion toasts for newly completed items
      newlyCompleted.forEach((itemId, index) => {
        setTimeout(() => showCompletionToast(itemId), 500 + (index * 200)); // Stagger toasts for multiple completions
      });
      
      // Special toast for completing all items
      if (newCompletedCount === items.length && items.length > 0) {
        setTimeout(() => {
          showInfoToast('🎊 INCREDIBLE! You\'ve completed your entire wedding planning setup! You\'re ready to plan the perfect wedding!');
        }, 1000);
      }
      
      // Update previous completed items
      setPreviousCompletedItems(currentCompletedItems);
      
      // Expand first 3 incomplete items by default to show users what's available
      const incompleteItems = items.filter(item => !item.completed);
      const itemsToExpand = incompleteItems.slice(0, 3).map(item => item.id);
      setExpandedItems(new Set(itemsToExpand));
    }
  }, [userData, progressData]);

  // Show loading spinner during onboarding check
  if (onboardingCheckLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Checking your account..." />
      </div>
    );
  }

  // Don't render if not authenticated
    if (!user) {
    return null;
  }

  const progressPercentage = progressItems.length > 0 ? Math.round((completedCount / progressItems.length) * 100) : 0;

  return (
    <>
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
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={bannerLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8" style={{ width: '100%', maxWidth: '1152px' }}>
        <div className="space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center mb-8">
            {/* Welcome Image */}
            <div className="w-full flex justify-center">
              <img 
                src="/Welcome.png" 
                alt="Welcome to your wedding planning journey" 
                className="w-[320px] h-auto"
              />
            </div>
            <h3 className="text-[#332B42] mb-2">
              Welcome to planning perfection, {userName || 'there'}!
            </h3>
            <p className="text-sm text-[#5A4A42] max-w-2xl mx-auto font-work">
              Let's get you set up with everything you need to plan your perfect wedding. 
              Track your progress and discover powerful features as you go.
            </p>
          </div>

          {/* Quick Guide Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <div className="flex items-center justify-between">
              <div className="w-3/4 pr-8">
                <h5 className="text-[#332B42] mb-2">
                  A quick guide to planning your perfect wedding
                </h5>
                <p className="text-sm text-[#5A4A42] mb-4 font-work">
                  From Paige's wedding planning experts
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#A85C36] text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">1</div>
                    <p className="text-sm text-[#5A4A42] font-work">
                      <strong>Start with your profile:</strong> Add your partner and define your wedding style to get personalized recommendations.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#A85C36] text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">2</div>
                    <p className="text-sm text-[#5A4A42] font-work">
                      <strong>Set up your budget:</strong> Create a realistic budget and track expenses to stay on track financially.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#A85C36] text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">3</div>
                    <p className="text-sm text-[#5A4A42] font-work">
                      <strong>Connect with vendors:</strong> Import your contacts and use our AI-powered messaging to communicate efficiently.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#A85C36] text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">4</div>
                    <p className="text-sm text-[#5A4A42] font-work">
                      <strong>Stay organized:</strong> Create mood boards, manage tasks, and plan your seating chart all in one place.
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-8 pt-8">
                    <Link 
                      href="/messages"
                      className="btn-primaryinverse no-underline"
                    >
                      Skip to Messages
                    </Link>
                    <Link 
                      href="/settings"
                      className="btn-primary no-underline"
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              </div>
              
                    {/* Paige illustration */}
                    <div className="hidden lg:block w-1/4">
                      <div className="h-full rounded-lg overflow-hidden">
                        <img 
                          src="/Paige.png" 
                          alt="Paige" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="bg-white rounded-lg border border-[#E0DBD7] p-6">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-[#332B42]">Your Progress</h5>
              <span className="text-sm text-[#5A4A42] font-work">{completedCount} of {progressItems.length} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-[#A85C36] h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-sm text-[#5A4A42] font-work">
              {progressPercentage === 100 
                ? "🎉 Congratulations! You've completed all the essential setup steps."
                : `You're ${progressPercentage}% complete with your wedding planning setup.`
              }
            </p>
          </div>

          {/* Progress Items Accordion */}
          <div className="space-y-3">
            {progressItems.map((item, index) => {
              const isExpanded = expandedItems.has(item.id);
              const isJiggling = jiggleFields.has(item.jiggleField || '');
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`bg-white rounded-lg border transition-all duration-200 ${
                    item.completed 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-[#E0DBD7] hover:border-[#A85C36]'
                  } ${isJiggling ? 'animate-jiggle' : ''}`}
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleAccordion(item.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className={`p-2 rounded-lg ${
                        item.completed 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.completed ? <CheckCircle className="w-5 h-5" /> : item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h6 className={`${
                          item.completed ? 'text-green-800' : 'text-[#332B42]'
                        }`}>
                          {item.title}
                        </h6>
                        <p className="text-xs text-[#5A4A42] mt-1 font-work">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.completed 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.completed ? 'Complete' : 'Pending'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 pb-4 border-t border-gray-100"
                    >
                      <div className="pt-4 space-y-3">
                        <p className="text-sm text-[#5A4A42] font-work">
                          {item.description}
                        </p>
                        
                        {/* Paige AI encouragement for specific items */}
                        {(item.id === 'todos' || item.id === 'moodboard' || item.id === 'seating-chart') && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-700 font-work">
                              💡 <strong>Feeling overwhelmed?</strong> Let Paige create personalized resources for you! 
                              Use the AI features to generate custom todo lists, moodboards, or seating arrangements.
                            </p>
            </div>
          )}
                        
                        <div className="flex gap-2 justify-end">
                          {item.jiggleField && (
                            <button
                              onClick={() => handleJiggleEffect(item.jiggleField!)}
                              className="btn-primaryinverse"
                            >
                              Show me where
                            </button>
                          )}
                          <button
                            onClick={() => handleProgressItemClick(item)}
                            className="btn-primary"
                          >
                            {item.actionText}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-[#E0DBD7] p-6">
            <h5 className="text-[#332B42] mb-4">Quick Actions</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link 
                href="/messages"
                className="flex flex-col items-center p-4 rounded-lg border border-[#E0DBD7] hover:border-[#A85C36] hover:bg-[#F8F6F4] transition-colors group"
              >
                <MessageSquare className="w-6 h-6 text-[#A85C36] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-work font-medium text-[#332B42]">Messages</span>
              </Link>
              <Link 
                href="/budget"
                className="flex flex-col items-center p-4 rounded-lg border border-[#E0DBD7] hover:border-[#A85C36] hover:bg-[#F8F6F4] transition-colors group"
              >
                <DollarSign className="w-6 h-6 text-[#A85C36] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-work font-medium text-[#332B42]">Budget</span>
              </Link>
              <Link 
                href="/todo"
                className="flex flex-col items-center p-4 rounded-lg border border-[#E0DBD7] hover:border-[#A85C36] hover:bg-[#F8F6F4] transition-colors group"
              >
                <ClipboardList className="w-6 h-6 text-[#A85C36] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-work font-medium text-[#332B42]">To-Do</span>
              </Link>
              <Link 
                href="/moodboards"
                className="flex flex-col items-center p-4 rounded-lg border border-[#E0DBD7] hover:border-[#A85C36] hover:bg-[#F8F6F4] transition-colors group"
              >
                <Palette className="w-6 h-6 text-[#A85C36] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-work font-medium text-[#332B42]">Mood Boards</span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}
