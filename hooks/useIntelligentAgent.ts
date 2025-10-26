/**
 * Intelligent Agent Hook - 2025 Implementation
 * 
 * SAFETY FEATURES:
 * - Feature flag protection
 * - Error boundary integration
 * - Automatic retry with backoff
 * - Resource usage monitoring
 * - Graceful degradation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WeddingPlanningAgentCoordinator, CoordinatedInsights } from '@/lib/agents/agentCoordinator';
import { isAgentFeatureEnabled, AGENT_FEATURE_FLAGS } from '@/lib/featureFlags/agentFlags';

export interface UseIntelligentAgentOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  maxRetries?: number;
  enabled?: boolean;
}

export interface UseIntelligentAgentReturn {
  insights: CoordinatedInsights | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  isEnabled: boolean;
  retryCount: number;
}

const DEFAULT_OPTIONS: Required<UseIntelligentAgentOptions> = {
  autoRefresh: false,
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  enabled: true
};

/**
 * Hook for accessing intelligent wedding planning agent insights
 */
export function useIntelligentAgent(options: UseIntelligentAgentOptions = {}): UseIntelligentAgentReturn {
  const { user } = useAuth();
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [insights, setInsights] = useState<CoordinatedInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs for cleanup and control
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isUnmountedRef = useRef(false);

  // Check if agent is enabled for this user
  const isEnabled = user?.uid ? 
    isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.INTELLIGENT_AGENT_ENABLED, user.uid) && config.enabled :
    false;

  /**
   * Generate insights with error handling and retry logic
   */
  const generateInsights = useCallback(async (isRetry = false): Promise<void> => {
    if (!user?.uid || !isEnabled) {
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
      }

      // Create agent coordinator
      const coordinator = new WeddingPlanningAgentCoordinator({
        userId: user.uid,
        userEmail: user.email || undefined,
        // Additional context can be added here from user profile
      });

      // Generate insights
      const result = await coordinator.generateInsights();

      // Check if component is still mounted
      if (isUnmountedRef.current || abortControllerRef.current?.signal.aborted) {
        return;
      }

      setInsights(result);
      setLastUpdated(new Date());
      setRetryCount(0); // Reset retry count on success
      setError(null);

      // Log success for monitoring
      if (process.env.NODE_ENV === 'development') {
        console.log('[useIntelligentAgent] Insights generated successfully', {
          insightCount: result.insights.length,
          processingTime: result.metadata.totalProcessingTime,
          cacheHitRate: result.metadata.cacheHitRate
        });
      }

    } catch (err) {
      if (isUnmountedRef.current || abortControllerRef.current?.signal.aborted) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[useIntelligentAgent] Failed to generate insights:', err);

      // Implement retry logic with exponential backoff
      if (retryCount < config.maxRetries && !isRetry) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
        setRetryCount(prev => prev + 1);
        
        setTimeout(() => {
          if (!isUnmountedRef.current) {
            generateInsights(true);
          }
        }, backoffDelay);
        
        setError(`Retrying... (${retryCount + 1}/${config.maxRetries})`);
      } else {
        setError(`Unable to load insights: ${errorMessage}`);
        setRetryCount(0);
      }
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.uid, user?.email, isEnabled, retryCount, config.maxRetries]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async (): Promise<void> => {
    setRetryCount(0); // Reset retry count for manual refresh
    await generateInsights();
  }, [generateInsights]);

  /**
   * Set up auto-refresh if enabled
   */
  useEffect(() => {
    if (!config.autoRefresh || !isEnabled) {
      return;
    }

    const scheduleNextRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          generateInsights();
          scheduleNextRefresh(); // Schedule next refresh
        }
      }, config.refreshInterval);
    };

    scheduleNextRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [config.autoRefresh, config.refreshInterval, isEnabled, generateInsights]);

  /**
   * Initial load when user or enabled state changes
   */
  useEffect(() => {
    if (isEnabled && user?.uid) {
      generateInsights();
    } else {
      // Clear data when disabled
      setInsights(null);
      setError(null);
      setLastUpdated(null);
      setRetryCount(0);
    }
  }, [isEnabled, user?.uid, generateInsights]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear timeouts
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    insights,
    loading,
    error,
    lastUpdated,
    refresh,
    isEnabled,
    retryCount
  };
}

/**
 * Hook for checking agent feature availability
 */
export function useAgentFeatureAvailability() {
  const { user } = useAuth();
  
  if (!user?.uid) {
    return {
      coreAgent: false,
      todoInsights: false,
      budgetAnalysis: false,
      vendorRecs: false,
      proactiveAlerts: false
    };
  }

  return {
    coreAgent: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.INTELLIGENT_AGENT_ENABLED, user.uid),
    todoInsights: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_TODO_INSIGHTS, user.uid),
    budgetAnalysis: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_BUDGET_ANALYSIS, user.uid),
    vendorRecs: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_VENDOR_RECOMMENDATIONS, user.uid),
    proactiveAlerts: isAgentFeatureEnabled(AGENT_FEATURE_FLAGS.AGENT_PROACTIVE_ALERTS, user.uid)
  };
}
