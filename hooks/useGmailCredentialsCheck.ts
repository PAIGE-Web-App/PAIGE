import { useState, useCallback } from 'react';
import { useCustomToast } from './useCustomToast';

interface GmailCredentialsCheck {
  hasValidCredentials: boolean;
  needsReauth: boolean;
  isLoading: boolean;
  error: string | null;
}

// Cache to avoid repeated API calls
let credentialsCache: { userId: string; result: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds

export function useGmailCredentialsCheck() {
  const [checkState, setCheckState] = useState<GmailCredentialsCheck>({
    hasValidCredentials: false,
    needsReauth: false,
    isLoading: false,
    error: null
  });
  
  const { showErrorToast } = useCustomToast();

  const checkGmailCredentials = useCallback(async (userId: string): Promise<boolean> => {
    if (!userId) {
      setCheckState({
        hasValidCredentials: false,
        needsReauth: true,
        isLoading: false,
        error: 'User ID not provided'
      });
      return false;
    }

    // Check cache first
    if (credentialsCache && 
        credentialsCache.userId === userId && 
        Date.now() - credentialsCache.timestamp < CACHE_DURATION) {
      setCheckState({
        hasValidCredentials: credentialsCache.result,
        needsReauth: !credentialsCache.result,
        isLoading: false,
        error: null
      });
      return credentialsCache.result;
    }

    setCheckState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/check-gmail-auth-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit hit - assume credentials are valid to avoid blocking user
          console.warn('Rate limit hit on Gmail credentials check, assuming valid credentials');
          setCheckState({
            hasValidCredentials: true,
            needsReauth: false,
            isLoading: false,
            error: null
          });
          return true;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.needsReauth) {
        setCheckState({
          hasValidCredentials: false,
          needsReauth: true,
          isLoading: false,
          error: data.message || 'Gmail authentication required'
        });
        return false;
      }

      // Check if user has Gmail connected
      if (!data.userData?.gmailConnected || !data.userData?.googleTokens?.accessToken) {
        setCheckState({
          hasValidCredentials: false,
          needsReauth: true,
          isLoading: false,
          error: 'Gmail not connected'
        });
        return false;
      }

      // Check if tokens are expired
      const { accessToken, expiryDate } = data.userData.googleTokens;
      if (!accessToken || (expiryDate && expiryDate < Date.now())) {
        setCheckState({
          hasValidCredentials: false,
          needsReauth: true,
          isLoading: false,
          error: 'Gmail access token expired'
        });
        return false;
      }

      // Check if gmail.modify scope is present (required for Gmail Watch API)
      const scope = data.userData.googleTokens.scope || '';
      if (!scope.includes('https://www.googleapis.com/auth/gmail.modify')) {
        setCheckState({
          hasValidCredentials: false,
          needsReauth: true,
          isLoading: false,
          error: 'Missing required Gmail permissions'
        });
        return false;
      }

      setCheckState({
        hasValidCredentials: true,
        needsReauth: false,
        isLoading: false,
        error: null
      });
      
      // Cache the result
      credentialsCache = {
        userId,
        result: true,
        timestamp: Date.now()
      };
      
      return true;

    } catch (error: any) {
      console.error('Error checking Gmail credentials:', error);
      setCheckState({
        hasValidCredentials: false,
        needsReauth: true,
        isLoading: false,
        error: error.message || 'Failed to check Gmail credentials'
      });
      return false;
    }
  }, []);

  const resetCheck = useCallback(() => {
    setCheckState({
      hasValidCredentials: false,
      needsReauth: false,
      isLoading: false,
      error: null
    });
    // Clear cache when resetting
    credentialsCache = null;
  }, []);

  const clearCache = useCallback(() => {
    credentialsCache = null;
  }, []);

  return {
    ...checkState,
    checkGmailCredentials,
    resetCheck,
    clearCache
  };
}
