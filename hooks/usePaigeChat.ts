/**
 * Hook for managing Paige AI Chat state and context
 * Provides contextual awareness across different pages
 */

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ChatContext {
  page: string;
  data?: any;
  userId?: string;
}

interface UsePaigeChatReturn {
  isVisible: boolean;
  isMinimized: boolean;
  currentContext: ChatContext;
  toggleChat: () => void;
  showChat: () => void;
  hideChat: () => void;
  updateContext: (data: any) => void;
  setMinimized: (minimized: boolean) => void;
}

export function usePaigeChat(initialData?: any): UsePaigeChatReturn {
  const { user } = useAuth();
  const pathname = usePathname();
  
  // Chat visibility state
  const [isVisible, setIsVisible] = useState(() => {
    // Check if user has chat enabled (could be a user preference)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('paige-chat-visible');
      return saved ? JSON.parse(saved) : true; // Default to visible
    }
    return true;
  });

  // Chat minimized state
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('paige-chat-minimized');
      return saved ? JSON.parse(saved) : false; // Default to expanded
    }
    return false;
  });

  // Current page context
  const [currentContext, setCurrentContext] = useState<ChatContext>({
    page: getPageFromPathname(pathname),
    data: initialData,
    userId: user?.uid,
  });

  // Update context when pathname or user changes
  useEffect(() => {
    setCurrentContext(prev => ({
      ...prev,
      page: getPageFromPathname(pathname),
      userId: user?.uid,
    }));
  }, [pathname, user?.uid]);

  // Save visibility preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('paige-chat-visible', JSON.stringify(isVisible));
    }
  }, [isVisible]);

  // Save minimized preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('paige-chat-minimized', JSON.stringify(isMinimized));
    }
  }, [isMinimized]);

  const toggleChat = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  const showChat = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideChat = useCallback(() => {
    setIsVisible(false);
  }, []);

  const updateContext = useCallback((data: any) => {
    setCurrentContext(prev => ({
      ...prev,
      data: { ...prev.data, ...data }
    }));
  }, []);

  const setMinimized = useCallback((minimized: boolean) => {
    setIsMinimized(minimized);
  }, []);

  return {
    isVisible,
    isMinimized,
    currentContext,
    toggleChat,
    showChat,
    hideChat,
    updateContext,
    setMinimized,
  };
}

/**
 * Extract page name from pathname
 */
function getPageFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) return 'dashboard';
  
  const pageMap: Record<string, string> = {
    'todo': 'todo',
    'budget': 'budget',
    'vendors': 'vendors',
    'messages': 'messages',
    'moodboards': 'moodboards',
    'dashboard': 'dashboard',
    'settings': 'settings',
    'timeline': 'timeline',
    'seating-charts': 'seating',
  };

  return pageMap[segments[0]] || segments[0];
}

/**
 * Hook for pages to provide context data to Paige
 */
export function usePaigeContext(pageData: any) {
  const { updateContext } = usePaigeChat();
  
  useEffect(() => {
    updateContext(pageData);
  }, [pageData, updateContext]);
}

/**
 * Feature flag check for Paige chat
 * Now enabled for ALL authenticated users!
 */
export function isPaigeChatEnabled(userId?: string): boolean {
  // Check environment variables for global enable
  const isGloballyEnabled = process.env.NEXT_PUBLIC_ENABLE_INTELLIGENT_AGENT === 'true';
  
  if (!isGloballyEnabled) return false;
  
  // If globally enabled and user is authenticated, enable for everyone
  if (userId) {
    return true; // ✅ Now enabled for ALL users!
  }
  
  return false; // Still requires authentication
}
