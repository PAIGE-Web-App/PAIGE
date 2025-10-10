import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
// checkProgressData function moved inline below

interface DashboardData {
  userData: any;
  progressData: any;
  todoData: any[];
  budgetData: any;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface DashboardDataContextType extends DashboardData {
  refreshData: () => Promise<void>;
  isDataFresh: () => boolean;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export const useDashboardData = () => {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider');
  }
  return context;
};

interface DashboardDataProviderProps {
  children: React.ReactNode;
}

export const DashboardDataProvider: React.FC<DashboardDataProviderProps> = ({ children }) => {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // Cache duration: 5 minutes (300000ms)
  const CACHE_DURATION = 5 * 60 * 1000;

  const isDataFresh = useCallback(() => {
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_DURATION;
  }, [lastFetched]);

  const fetchRealData = useCallback(async () => {
    if (!user) return;
    
    try {
      // Fetch todo items (optimized query)
      const todoQuery = query(
        collection(db, 'users', user.uid, 'todoItems'),
        limit(50)
      );
      const todoSnapshot = await getDocs(todoQuery);
              const allTodos = todoSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              } as any));
      
      // Filter and sort todos in memory (no additional Firestore queries)
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

      // Fetch budget data (optimized query)
      const budgetQuery = query(
        collection(db, 'users', user.uid, 'budgetCategories'),
        limit(50)
      );
      const budgetSnapshot = await getDocs(budgetQuery);
      
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
          percentage: totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0
        });
      }
    } catch (error) {
      console.error('Error fetching real data:', error);
      setError('Failed to fetch dashboard data');
    }
  }, [user]);

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
        
        // Fetch conditional block data
        await fetchRealData();
        
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

  const value: DashboardDataContextType = {
    userData,
    progressData,
    todoData,
    budgetData,
    loading,
    error,
    lastFetched,
    refreshData,
    isDataFresh
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
};
