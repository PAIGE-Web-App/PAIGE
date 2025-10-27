import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
// checkProgressData function moved inline below

interface AgentData {
  userData: any;
  progressData: any;
  todoData: any[];
  budgetData: any;
  budgetCategories: any[]; // ✨ Full budget categories
  budgetItems: any[]; // ✨ All budget items
  timelineData: any[]; // ✨ Timeline events
  contactsData: any[]; // ✨ NEW: User contacts for vendor info
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface AgentDataContextType extends AgentData {
  refreshData: () => Promise<void>;
  isDataFresh: () => boolean;
}

const AgentDataContext = createContext<AgentDataContextType | undefined>(undefined);

// Keep old hook name for backwards compatibility with Dashboard
export const useDashboardData = () => {
  const context = useContext(AgentDataContext);
  if (!context) {
    throw new Error('useDashboardData must be used within an AgentDataProvider');
  }
  return context;
};

// New hook name for other pages
export const useAgentData = () => {
  const context = useContext(AgentDataContext);
  if (!context) {
    throw new Error('useAgentData must be used within an AgentDataProvider');
  }
  return context;
};

interface AgentDataProviderProps {
  children: React.ReactNode;
  mode?: 'dashboard' | 'full'; // ✨ NEW: Control data fetch scope
}

export const AgentDataProvider: React.FC<AgentDataProviderProps> = ({ children, mode = 'dashboard' }) => {
  const { user } = useAuth();

  // Progress data checking function
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
  const [userData, setUserData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [todoData, setTodoData] = useState<any[]>([]);
  const [budgetData, setBudgetData] = useState<any>(null);
  const [budgetCategories, setBudgetCategories] = useState<any[]>([]); // ✨ Full budget categories
  const [budgetItems, setBudgetItems] = useState<any[]>([]); // ✨ All budget items
  const [timelineData, setTimelineData] = useState<any[]>([]); // ✨ Timeline events
  const [contactsData, setContactsData] = useState<any[]>([]); // ✨ NEW: User contacts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // Cache duration: 5 minutes (300000ms)
  const CACHE_DURATION = 5 * 60 * 1000;

  const isDataFresh = useCallback(() => {
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_DURATION;
  }, [lastFetched]);

  const fetchRealData = useCallback(async (currentUserData?: any) => {
    if (!user) return;
    
    try {
      // ✨ Fetch todo items (full or limited based on mode)
      const todoQuery = mode === 'full'
        ? query(collection(db, 'users', user.uid, 'todoItems'))
        : query(collection(db, 'users', user.uid, 'todoItems'), limit(50));
      
      const todoSnapshot = await getDocs(todoQuery);
      const allTodos = todoSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      
      if (mode === 'dashboard') {
        // Dashboard mode: filter to upcoming only
        const now = new Date();
        const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        const upcomingTodos = allTodos
          .filter(todo => {
            const deadlineField = todo.deadline;
            if (!deadlineField) return false;
            
            const deadline = deadlineField?.toDate ? deadlineField.toDate() : new Date(deadlineField);
            const isThisWeek = deadline >= now && deadline <= nextWeek;
            const isRecentlyCompleted = (todo.isCompleted || todo.completed) && 
              deadline >= new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)) && 
              deadline <= now;
            
            return isThisWeek || isRecentlyCompleted;
          })
          .sort((a, b) => {
            const deadlineA = a.deadline?.toDate ? a.deadline.toDate() : new Date(a.deadline);
            const deadlineB = b.deadline?.toDate ? b.deadline.toDate() : new Date(b.deadline);
            return deadlineA.getTime() - deadlineB.getTime();
          })
          .slice(0, 6);
        
        setTodoData(upcomingTodos);
      } else {
        // Full mode: return all todos
        setTodoData(allTodos);
      }

      // ✨ Fetch budget categories (full or limited)
      const budgetQuery = mode === 'full'
        ? query(collection(db, 'users', user.uid, 'budgetCategories'))
        : query(collection(db, 'users', user.uid, 'budgetCategories'), limit(50));
      
      const budgetSnapshot = await getDocs(budgetQuery);
      const categories = budgetSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (mode === 'full') {
        setBudgetCategories(categories);
      }
      
      // Calculate aggregated budget data
      if (budgetSnapshot.size > 0) {
        let totalAllocated = 0;
        let totalSpent = 0;
        
        budgetSnapshot.docs.forEach(doc => {
          const data = doc.data();
          totalAllocated += data.allocatedAmount || 0;
          totalSpent += data.spentAmount || 0;
        });
        
        setBudgetData({
          totalAllocated,
          totalSpent,
          remaining: totalAllocated - totalSpent,
          percentage: totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0,
          maxBudget: currentUserData?.maxBudget || 0, // ✅ Use parameter instead of state
          categories: mode === 'full' ? categories : []
        });
      }

      // ✨ Fetch budget items (full mode only)
      if (mode === 'full') {
        const itemsQuery = query(collection(db, 'users', user.uid, 'budgetItems'));
        const itemsSnapshot = await getDocs(itemsQuery);
        const items = itemsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBudgetItems(items);
      }

      // ✨ Fetch timeline data (full mode only)
      if (mode === 'full') {
        const timelineQuery = query(collection(db, 'users', user.uid, 'timeline'));
        const timelineSnapshot = await getDocs(timelineQuery);
        const timeline = timelineSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTimelineData(timeline);
      }

      // ✨ Fetch contacts data (full mode only)
      if (mode === 'full') {
        const contactsQuery = query(collection(db, 'users', user.uid, 'contacts'));
        const contactsSnapshot = await getDocs(contactsQuery);
        const contacts = contactsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setContactsData(contacts);
      }
    } catch (error) {
      console.error('Error fetching real data:', error);
      setError('Failed to fetch agent data');
    }
  }, [user, mode]); // ✅ Removed userData dependency - causes infinite loop

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Single user document fetch
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserData(userData);
        
        // Check progress data (reuses existing logic)
        const progressChecks = await checkProgressData(user.uid, userData);
        setProgressData(progressChecks);
        
        // Fetch conditional block data (pass userData to avoid dependency loop)
        await fetchRealData(userData);
        
        setLastFetched(Date.now());
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  }, [user, fetchRealData]);

  const refreshData = useCallback(async () => {
    await fetchUserData();
  }, [fetchUserData]);

  // Initial data fetch
  useEffect(() => {
    if (user && !isDataFresh()) {
      fetchUserData();
    }
  }, [user, fetchUserData, isDataFresh]);

  // Listen for profile refresh events (maintains existing functionality)
  useEffect(() => {
    const handleRefreshUserProfile = () => {
      console.log('🔄 Dashboard refreshing user data due to profile update');
      refreshData();
    };

    window.addEventListener('refreshUserProfile', handleRefreshUserProfile);
    return () => {
      window.removeEventListener('refreshUserProfile', handleRefreshUserProfile);
    };
  }, [refreshData]);

  const value: AgentDataContextType = {
    userData,
    progressData,
    todoData,
    budgetData,
    budgetCategories,
    budgetItems,
    timelineData,
    contactsData, // ✨ NEW
    loading,
    error,
    lastFetched,
    refreshData,
    isDataFresh
  };

  return (
    <AgentDataContext.Provider value={value}>
      {children}
    </AgentDataContext.Provider>
  );
};

// ✨ Export both names for backwards compatibility
export const DashboardDataProvider = AgentDataProvider;
