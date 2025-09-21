import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { handleLogout } from '@/utils/logout';

interface UseIdleTimeoutOptions {
  timeoutMinutes?: number; // Default 20 minutes
  showWarningMinutes?: number; // Default 2 minutes before logout
  onWarning?: () => void;
  onLogout?: () => void;
}

export const useIdleTimeout = ({
  timeoutMinutes = 30,
  showWarningMinutes = 5,
  onWarning,
  onLogout
}: UseIdleTimeoutOptions = {}) => {
  const { user } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    
    warningShownRef.current = false;

    if (!user) return;

    // Set warning timer
    const warningTime = (timeoutMinutes - showWarningMinutes) * 60 * 1000;
    warningTimeoutRef.current = setTimeout(() => {
      warningShownRef.current = true;
      console.log(`⚠️ User idle warning triggered - ${showWarningMinutes} minutes until logout`);
      if (onWarning) {
        onWarning();
      }
    }, warningTime);

    // Set logout timer
    const logoutTime = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(async () => {
      console.log(`⏰ User idle timeout reached after ${timeoutMinutes} minutes, logging out...`);
      if (onLogout) {
        onLogout();
      }
      await handleLogout();
    }, logoutTime);
  }, [user, timeoutMinutes, showWarningMinutes, onWarning, onLogout]);

  const handleUserActivity = useCallback(() => {
    // Only reset if warning was actually shown
    if (warningShownRef.current) {
      console.log('🔄 User activity detected, resetting idle timeout');
      warningShownRef.current = false;
    }
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!user) {
      // Clear timers if no user
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      return;
    }

    // Start the timer when user is authenticated
    resetTimer();

    // Add event listeners for user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [user, handleUserActivity, resetTimer]);

  return {
    resetTimer,
    isWarningShown: warningShownRef.current
  };
}; 