/**
 * Contextual Agent Hook - Detects user context and provides relevant insights
 * Uses Intersection Observer and page context to trigger contextual AI
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '@/contexts/AuthContext';

interface ContextualInsight {
  type: 'urgent' | 'opportunity' | 'recommendation' | 'optimization';
  title: string;
  description: string;
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
  priority: 'high' | 'medium' | 'low';
  context: string;
}

interface UseContextualAgentOptions {
  enabled?: boolean;
  triggerOnPageLoad?: boolean;
  triggerOnScroll?: boolean;
  debounceMs?: number;
  maxInsights?: number;
}

interface UseContextualAgentReturn {
  insights: ContextualInsight[];
  loading: boolean;
  error: string | null;
  generateInsights: (context?: any) => Promise<void>;
  dismissInsight: (index: number) => void;
  executeAction: (action: string) => Promise<void>;
  isEnabled: boolean;
}

const DEFAULT_OPTIONS: Required<UseContextualAgentOptions> = {
  enabled: true,
  triggerOnPageLoad: true,
  triggerOnScroll: false,
  debounceMs: 3000, // Increased to 3 seconds to prevent rapid calls
  maxInsights: 3,
};

/**
 * Hook for contextual AI agent that provides insights based on current page and user behavior
 */
export function useContextualAgent(
  options: UseContextualAgentOptions = {}
): UseContextualAgentReturn {
  const { user } = useAuth();
  const pathname = usePathname();
  const config = { ...DEFAULT_OPTIONS, ...options };

  // State
  const [insights, setInsights] = useState<ContextualInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastContext, setLastContext] = useState<string>('');

  // Refs
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isUnmountedRef = useRef(false);
  const insightsCacheRef = useRef<Map<string, { insights: ContextualInsight[]; timestamp: number }>>(new Map());

  // Check if agent is enabled (using existing feature flags)
  const isEnabled = user?.uid ? 
    config.enabled && 
    process.env.NODE_ENV === 'development' && // Only in dev for now
    process.env.NEXT_PUBLIC_ENABLE_INTELLIGENT_AGENT === 'true' :
    false;

  /**
   * Get current page context
   */
  const getCurrentContext = useCallback(() => {
    const page = pathname.split('/')[1] || 'dashboard';
    
    // Map pathname to page types
    const pageMap: Record<string, string> = {
      '': 'dashboard',
      'dashboard': 'dashboard',
      'todo': 'todo',
      'vendors': 'vendors',
      'budget': 'budget',
      'messages': 'messages',
      'moodboards': 'moodboards',
      'settings': 'settings',
    };

    return {
      page: pageMap[page] || 'other',
      pathname,
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    };
  }, [pathname]);

  /**
   * Generate contextual insights
   */
  const generateInsights = useCallback(async (additionalContext?: any) => {
    if (!isEnabled || !user?.uid || loading) return;

    const context = getCurrentContext();
    const contextKey = `${context.page}-${context.pathname}-${JSON.stringify(additionalContext || {})}`;

    // Check cache first (5 minute cache)
    const cached = insightsCacheRef.current.get(contextKey);
    if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
      console.log('📋 Using cached insights for:', contextKey);
      setInsights(cached.insights);
      setLastContext(contextKey);
      return;
    }

    // Avoid duplicate requests - be more strict about caching
    if (contextKey === lastContext && !additionalContext) {
      console.log('🔄 Skipping duplicate insight generation for:', contextKey);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build context for AI
      const aiContext = {
        page: context.page as any,
        userAction: 'viewing',
        currentData: additionalContext || {},
        weddingContext: {
          // These would come from your existing user profile data
          daysUntilWedding: undefined, // Calculate from wedding date
          budget: undefined, // From user profile
          location: undefined, // From user profile
          style: [], // From mood boards
        },
      };

      // Call server-side API instead of client-side AI
      const response = await fetch('/api/contextual-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: aiContext }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!isUnmountedRef.current) {
        // Transform the AI result to match our interface
        const transformedInsights: ContextualInsight[] = result.insights
          .filter(insight => insight.type && insight.title && insight.description && insight.priority && insight.context)
          .map(insight => ({
            type: insight.type as 'urgent' | 'opportunity' | 'recommendation' | 'optimization',
            title: insight.title,
            description: insight.description,
            priority: insight.priority as 'high' | 'medium' | 'low',
            context: insight.context,
            actions: insight.actions?.map(action => ({
              label: action.label || '',
              action: action.action || '',
              primary: action.primary || false,
            })) || [],
          }))
          .slice(0, config.maxInsights);
        
        setInsights(transformedInsights);
        setLastContext(contextKey);
        
        // Cache the results
        insightsCacheRef.current.set(contextKey, {
          insights: transformedInsights,
          timestamp: Date.now()
        });
      }

    } catch (err) {
      if (!isUnmountedRef.current) {
        console.error('Contextual insights generation failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate insights');
      }
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false);
      }
    }
  }, [isEnabled, user?.uid, config.maxInsights]);

  /**
   * Debounced insight generation
   */
  const debouncedGenerateInsights = useCallback((context?: any) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      generateInsights(context);
    }, config.debounceMs);
  }, [config.debounceMs]);

  /**
   * Dismiss an insight
   */
  const dismissInsight = useCallback((index: number) => {
    setInsights(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Execute an action from an insight
   */
  const executeAction = useCallback(async (action: string) => {
    try {
      // Parse action and execute
      const [actionType, ...params] = action.split(':');
      
      switch (actionType) {
        case 'navigate':
          if (typeof window !== 'undefined') {
            window.location.href = params[0];
          }
          break;
        
        case 'create-todo':
          // Integrate with your existing todo creation logic
          console.log('Create todo:', params);
          break;
        
        case 'search-vendors':
          // Integrate with vendor search
          console.log('Search vendors:', params);
          break;
        
        default:
          console.log('Unknown action:', action);
      }
    } catch (err) {
      console.error('Action execution failed:', err);
    }
  }, []);

  /**
   * Trigger insights on page load
   */
  useEffect(() => {
    if (config.triggerOnPageLoad && isEnabled) {
      debouncedGenerateInsights();
    }
  }, [pathname, config.triggerOnPageLoad, isEnabled]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    insights,
    loading,
    error,
    generateInsights,
    dismissInsight,
    executeAction,
    isEnabled,
  };
}

/**
 * Hook for detecting when specific elements come into view
 * Useful for triggering contextual insights based on what user is looking at
 */
export function useContextualTrigger(
  onTrigger: (element: Element) => void,
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const { ref, inView, entry } = useInView({
    threshold: options.threshold || 0.5,
    rootMargin: options.rootMargin || '0px',
    triggerOnce: false,
  });

  useEffect(() => {
    if (inView && entry?.target) {
      onTrigger(entry.target);
    }
  }, [inView, entry, onTrigger]);

  return { ref, inView };
}

/**
 * Hook for page-specific contextual insights
 */
export function usePageContextualInsights(page: string, data?: any) {
  const { insights, loading, generateInsights, ...rest } = useContextualAgent({
    triggerOnPageLoad: true,
    maxInsights: 2, // Fewer insights for page-specific
  });

  // Generate insights when page data changes
  useEffect(() => {
    if (data) {
      generateInsights(data);
    }
  }, [data, generateInsights]);

  // Filter insights for current page
  const pageInsights = insights.filter(insight => 
    insight.context === page || insight.context === 'all'
  );

  return {
    insights: pageInsights,
    loading,
    generateInsights,
    ...rest,
  };
}
