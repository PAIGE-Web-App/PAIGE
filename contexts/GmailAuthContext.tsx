'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { User } from 'firebase/auth';

interface GmailAuthContextType {
  needsReauth: boolean;
  isLoading: boolean;
  checkGmailAuth: () => Promise<void>;
  dismissBanner: () => void;
}

const GmailAuthContext = createContext<GmailAuthContextType | undefined>(undefined);

export function GmailAuthProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [needsReauth, setNeedsReauth] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(0);

  const checkGmailAuth = useCallback(async () => {
    if (!user?.uid || isLoading) return;
    
    // Only check once every 5 minutes to avoid unnecessary API calls
    const now = Date.now();
    if (now - lastChecked < 5 * 60 * 1000) return;
    
    setIsLoading(true);
    setLastChecked(now);
    
    try {
      const response = await fetch('/api/check-gmail-auth-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      
      const data = await response.json();
      setNeedsReauth(data.needsReauth || false);
    } catch (error) {
      console.error('Error checking Gmail auth status:', error);
      // Don't show banner on network errors, only on actual auth failures
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isLoading, lastChecked]);

  const dismissBanner = useCallback(() => {
    setNeedsReauth(false);
  }, []);

  // Check Gmail auth when user changes
  useEffect(() => {
    if (user?.uid) {
      checkGmailAuth();
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
