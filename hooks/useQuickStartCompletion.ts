import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalCompletionToasts } from './useGlobalCompletionToasts';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Simple global state to prevent duplicate toasts
let globalCompletedCards = new Set<string>();
let globalHasInitialized = false;
let globalToastShown = new Set<string>();

// Helper functions to manage localStorage-based toast tracking
const getStoredToastShown = (): Set<string> => {
  try {
    const stored = localStorage.getItem('quickstart-toasts-shown');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const setStoredToastShown = (toastIds: Set<string>) => {
  try {
    localStorage.setItem('quickstart-toasts-shown', JSON.stringify(Array.from(toastIds)));
  } catch {
    // Ignore localStorage errors
  }
};

const addToastShown = (toastId: string) => {
  const current = getStoredToastShown();
  current.add(toastId);
  setStoredToastShown(current);
  return current;
};

// Force hot reload

export const useQuickStartCompletion = () => {
  const { user } = useAuth();
  const { showCompletionToast } = useGlobalCompletionToasts();
  const [userData, setUserData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);

  // Fetch user data and progress data
  useEffect(() => {
    const fetchData = async () => {
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
        console.error('Error fetching user data for completion tracking:', error);
      }
    };

    fetchData();

    // DISABLED: Excessive 5-second polling was causing hundreds of network requests
    // const interval = setInterval(fetchData, 5000);
    // return () => clearInterval(interval);
  }, [user]);

  // Check progress data for all items
  const checkProgressData = async (userId: string, userData: any) => {
    const checks: any = {};
    
    try {
      // Batch all Firestore queries in parallel with limit(1) for existence checks
      const [contacts, todos, budget] = await Promise.all([
        getDocs(query(collection(db, 'users', userId, 'contacts'), limit(1))),
        getDocs(query(collection(db, 'users', userId, 'todoLists'), limit(1))),
        getDocs(query(collection(db, 'users', userId, 'budgetCategories'), limit(1)))
      ]);
      
      // Process results
      checks.hasContacts = contacts.size > 0;
      checks.hasTodos = todos.size > 0;
      checks.hasBudget = budget.size > 0;
      
      // Check moodboards (no Firestore query needed - uses userData)
      checks.hasMoodboards = (userData.moodBoards && userData.moodBoards.length > 0) || 
                            (userData.vibe && userData.vibe.length > 0);
      
    } catch (error) {
      console.error('Error checking progress data:', error);
    }
    
    return checks;
  };

  // Process completion with simple global state
  useEffect(() => {

    if (!user || !userData || !progressData) return;

    const quickStartCards = ['profile', 'style', 'contacts', 'budget', 'todos'];
    const currentCompleted = new Set(
      quickStartCards.filter(cardId => {
        switch (cardId) {
          case 'profile': return !!(userData?.partnerName);
          case 'style': return !!(progressData?.hasMoodboards);
          case 'contacts': return !!(progressData?.hasContacts);
          case 'budget': return !!(progressData?.hasBudget);
          case 'todos': return !!(progressData?.hasTodos);
          default: return false;
        }
      })
    );


    // Initialize on first load
    if (!globalHasInitialized) {
      globalCompletedCards = new Set(currentCompleted);
      globalHasInitialized = true;
      return;
    }

    // Reset toast tracking if user was previously incomplete and now completes something
    // This allows toasts to show again when user re-completes actions
    if (globalCompletedCards.size < 5 && currentCompleted.size > globalCompletedCards.size) {
      globalToastShown.clear();
      setStoredToastShown(new Set());
    }

    // Check for newly completed cards
    const newlyCompleted = Array.from(currentCompleted).filter(
      cardId => !globalCompletedCards.has(cardId)
    );


    // Check if we're completing all 5 cards
    const isCompletingAll = currentCompleted.size === 5 && globalCompletedCards.size < 5;

    // Show completion toasts for newly completed cards (only if not already shown)
    // Skip individual toasts if we're completing all 5 cards (to avoid duplicates)
    if (!isCompletingAll) {
      newlyCompleted.forEach((cardId, index) => {
        const storedToasts = getStoredToastShown();
        if (!storedToasts.has(cardId)) {
          addToastShown(cardId);
          setTimeout(() => {
            showCompletionToast(cardId);
          }, 500 + (index * 200));
        } else {
        }
      });
    } else {
    }

    // Special toast for completing all 5 cards
    if (isCompletingAll) {
      const storedToasts = getStoredToastShown();
      if (!storedToasts.has('quick-start-complete')) {
        addToastShown('quick-start-complete');
        setTimeout(() => {
          showCompletionToast('quick-start-complete');
        }, 500);
      } else {
      }
    }

    // Update global state
    globalCompletedCards = new Set(currentCompleted);
  }, [user, userData?.partnerName, progressData?.hasMoodboards, progressData?.hasContacts, progressData?.hasBudget, progressData?.hasTodos, showCompletionToast]);

  return {
    completedCards: Array.from(globalCompletedCards),
    totalCards: 5,
    completionPercentage: Math.round((globalCompletedCards.size / 5) * 100)
  };
};
