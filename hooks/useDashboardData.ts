import { useDashboardData as useDashboardDataContext } from '@/contexts/AgentDataContext'; // ✨ Updated path

/**
 * Custom hook that provides optimized dashboard data
 * Uses caching and centralized data fetching to minimize Firestore reads
 */
export const useDashboardData = () => {
  return useDashboardDataContext();
};

/**
 * Hook for getting user-specific data with automatic caching
 */
export const useUserData = () => {
  const { userData, loading, error, refreshData } = useDashboardData();
  
  return {
    userData,
    loading,
    error,
    refreshData
  };
};

/**
 * Hook for getting progress data with automatic caching
 */
export const useProgressData = () => {
  const { progressData, loading, error, refreshData } = useDashboardData();
  
  return {
    progressData,
    loading,
    error,
    refreshData
  };
};

/**
 * Hook for getting todo data with automatic caching
 */
export const useTodoData = () => {
  const { todoData, loading, error, refreshData } = useDashboardData();
  
  return {
    todoData,
    loading,
    error,
    refreshData
  };
};

/**
 * Hook for getting budget data with automatic caching
 */
export const useBudgetData = () => {
  const { budgetData, loading, error, refreshData } = useDashboardData();
  
  return {
    budgetData,
    loading,
    error,
    refreshData
  };
};
