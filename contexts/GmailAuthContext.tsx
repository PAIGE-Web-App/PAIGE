'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { User } from 'firebase/auth';

interface GmailAuthContextType {
  needsReauth: boolean;
  isLoading: boolean;
  checkGmailAuth: (force?: boolean) => Promise<void>;
  dismissBanner: () => void;
  setNeedsReauth: (value: boolean) => void; // Added for test pages
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
    
    // Only check once every 15 minutes to avoid unnecessary API calls, unless forced
    const now = Date.now();
    if (!force && now - lastChecked < 15 * 60 * 1000) return;
    
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

  // Listen for custom events that trigger the reauth banner
  // This allows Gmail API endpoints to trigger the banner when they encounter auth errors
  useEffect(() => {
    const handleGmailAuthRequired = (event: any) => {
      console.log('Gmail reauth required event received:', event.detail);
      console.log('Setting needsReauth to true...');
      
      // Use setTimeout to ensure state update happens after current execution
      setTimeout(() => {
        setNeedsReauth(true);
        console.log('needsReauth set to true (with timeout)');
      }, 0);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('gmail-auth-required', handleGmailAuthRequired);
      return () => {
        window.removeEventListener('gmail-auth-required', handleGmailAuthRequired);
      };
    }
  }, []);

  // DEBUG: Log when needsReauth changes
  useEffect(() => {
    console.log('GmailAuthContext: needsReauth changed to:', needsReauth);
  }, [needsReauth]);

  // DISABLED: Initial check was still causing excessive API calls on every user change
  // useEffect(() => {
  //   if (user?.uid) {
  //     // Add a small delay to ensure user document is fully created
  //     const timeoutId = setTimeout(async () => {
  //       // Try to check Gmail auth once
  //       await checkGmailAuth(true); // Force immediate check
  //     }, 1000); // Reduced delay to 1 second
  //     
  //     return () => clearTimeout(timeoutId);
  //   } else {
  //     setNeedsReauth(false);
  //   }
  // }, [user?.uid, checkGmailAuth]);

  // DISABLED: Periodic check was still causing excessive API calls
  // useEffect(() => {
  //   if (!user?.uid) return;
  //   
  //   const interval = setInterval(() => {
  //     checkGmailAuth();
  //   }, 15 * 60 * 1000); // 15 minutes to prevent rate limits
  //   
  //   return () => clearInterval(interval);
  // }, [user?.uid, checkGmailAuth]);

  // Check Gmail auth when app becomes visible (user returns from background)
  // DISABLED: This was causing excessive API calls on every page interaction
  // useEffect(() => {
  //   if (!user?.uid) return;
  //   
  //   const handleVisibilityChange = () => {
  //     if (!document.hidden) {
  //       // App became visible, check Gmail auth immediately
  //       checkGmailAuth(true); // Force check
  //     }
  //   };
  //   
  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, [user?.uid, checkGmailAuth]);

  // Add global error handler for Gmail API failures
  // REMOVED: Old gmail-api-error event listener that was conflicting with our new system
  // The new system uses 'gmail-auth-required' events which are handled above

  return (
    <GmailAuthContext.Provider value={{
      needsReauth,
      isLoading,
      checkGmailAuth,
      dismissBanner,
      setNeedsReauth // Added for test pages
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
