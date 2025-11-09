import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { userContextBuilder, UserContext, ContextOptions } from '../utils/userContextBuilder';

export function useUserContext(options: ContextOptions = {}) {
  const { user } = useAuth();
  const [context, setContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize options to prevent infinite loops
  const memoizedOptions = useMemo(() => options, [
    options.includeTodos,
    options.includeVendors,
    options.maxTodoItems,
    options.maxVendorItems,
    options.forceRefresh
  ]);

  const buildContext = useCallback(async (forceRefresh = false) => {
    if (!user?.uid) {
      setContext(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userContext = await userContextBuilder.buildUserContext(
        user.uid, 
        { ...memoizedOptions, forceRefresh }
      );
      setContext(userContext);
    } catch (err) {
      console.error('[useUserContext] Error building context:', err);
      setError(err instanceof Error ? err.message : 'Failed to build user context');
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, memoizedOptions]);

  // Build context on mount and when dependencies change
  useEffect(() => {
    buildContext();
  }, [buildContext]);

  // Refresh context manually
  const refreshContext = useCallback(() => {
    buildContext(true);
  }, [buildContext]);

  // Clear cache for current user
  const clearCache = useCallback(() => {
    if (user?.uid) {
      userContextBuilder.clearUserCache(user.uid);
    }
  }, [user?.uid]);

  // Get context summary for debugging
  const getContextSummary = useCallback(() => {
    if (!context) return 'No context available';
    return userContextBuilder.getContextSummary(context);
  }, [context]);

  return {
    context,
    loading,
    error,
    refreshContext,
    clearCache,
    getContextSummary,
    // Convenience getters for common context values
    userName: context?.userName,
    partnerName: context?.partnerName,
    weddingDate: context?.weddingDate,
    weddingLocation: context?.weddingLocation,
    hasVenue: context?.hasVenue,
    guestCount: context?.guestCount,
    maxBudget: context?.maxBudget,
    vibe: context?.vibe || [],
    planningStage: context?.planningStage,
    daysUntilWedding: context?.daysUntilWedding,
    completedTodos: context?.completedTodos || [],
    pendingTodos: context?.pendingTodos || [],
    selectedVendors: context?.selectedVendors || [],
    favoriteVendors: context?.favoriteVendors || [],
    recentTodoCount: context?.recentTodoCount || 0
  };
}

// Hook for getting just the essential context (faster, fewer Firebase reads)
export function useEssentialContext() {
  return useUserContext({
    includeTodos: false,
    includeVendors: false
  });
}

// Hook for getting full context with todos and vendors
export function useFullContext() {
  return useUserContext({
    includeTodos: true,
    includeVendors: true,
    maxTodoItems: 10,
    maxVendorItems: 5
  });
}
