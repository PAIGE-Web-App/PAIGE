'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { User } from 'firebase/auth';

interface GmailAuthContextType {
  needsReauth: boolean;
  isLoading: boolean;
  checkGmailAuth: (force?: boolean) => Promise<void>;
  dismissBanner: () => void;
}

const GmailAuthContext = createContext<GmailAuthContextType | undefined>(undefined);

export function GmailAuthProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [needsReauth, setNeedsReauth] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(0);
  const isCheckingRef = useRef(false);

  const checkGmailAuth = useCallback(async (force = false) => {
    if (!user?.uid || isCheckingRef.current) return;
    
    // Only check once every 5 minutes to avoid unnecessary API calls, unless forced
    const now = Date.now();
    if (!force && now - lastChecked < 5 * 60 * 1000) return;
    
    isCheckingRef.current = true;
    setIsLoading(true);
    setLastChecked(now);
    
    try {
      const response = await fetch('/api/check-gmail-auth-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, force }),
      });
      
      const data = await response.json();
      console.log('Gmail auth check result:', data);
      setNeedsReauth(data.needsReauth || false);
    } catch (error) {
      console.error('Error checking Gmail auth status:', error);
      // Don't show banner on network errors, only on actual auth failures
    } finally {
      setIsLoading(false);
      isCheckingRef.current = false;
    }
  }, [user?.uid, lastChecked]);

  const dismissBanner = useCallback(() => {
    setNeedsReauth(false);
  }, []);

  // Check Gmail auth when user changes
  useEffect(() => {
    if (user?.uid) {
      // Add a small delay to ensure user document is fully created
      const timeoutId = setTimeout(async () => {
        // Try to check Gmail auth once
        await checkGmailAuth();
      }, 2000); // Initial 2 second delay
      
      return () => clearTimeout(timeoutId);
    } else {
      setNeedsReauth(false);
    }
  }, [user?.uid, checkGmailAuth]);

  // Periodic check every 10 minutes
  useEffect(() => {
    if (!user?.uid) return;
    
    const interval = setInterval(() => {
      checkGmailAuth();
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(interval);
  }, [user?.uid, checkGmailAuth]);

  // Check Gmail auth when app becomes visible (user returns from background)
  useEffect(() => {
    if (!user?.uid) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App became visible, check Gmail auth immediately
        checkGmailAuth(true); // Force check
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.uid, checkGmailAuth]);

  return (
    <GmailAuthContext.Provider value={{
      needsReauth,
      isLoading,
      checkGmailAuth,
      dismissBanner
    }}>
      {children}
    </GmailAuthContext.Provider>
  );
}

export function useGmailAuth() {
  const context = useContext(GmailAuthContext);
  if (context === undefined) {
    throw new Error('useGmailAuth must be used within a GmailAuthProvider');
  }
  return context;
}
