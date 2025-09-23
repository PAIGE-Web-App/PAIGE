'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import IdleWarningModal from './IdleWarningModal';
import { useCustomToast } from '@/hooks/useCustomToast';

export default function IdleTimeoutManager() {
  const [showWarning, setShowWarning] = useState(false);
  const { showInfoToast } = useCustomToast();
  const warningShownRef = useRef(false);
  const lastToastTimeRef = useRef(0);

  const handleWarning = () => {
    // Prevent multiple warnings and toast spam
    if (warningShownRef.current) return;
    
    // Debounce toast notifications (prevent multiple toasts within 5 seconds)
    const now = Date.now();
    if (now - lastToastTimeRef.current < 5000) return;
    
    warningShownRef.current = true;
    lastToastTimeRef.current = now;
    setShowWarning(true);
    showInfoToast('You\'ll be logged out soon due to inactivity');
  };

  const handleStayLoggedIn = () => {
    warningShownRef.current = false;
    setShowWarning(false);
  };

  const handleLogout = async () => {
    warningShownRef.current = false;
    setShowWarning(false);
    // Actually perform the logout
    try {
      const { handleLogout: logoutUser } = await import('@/utils/logout');
      await logoutUser();
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: redirect to login
      window.location.href = '/login';
    }
  };

  // Use the idle timeout hook with configurable timeout
  // Match the session duration (8 hours = 480 minutes)
  const sessionDurationHours = parseInt(process.env.SESSION_DURATION_HOURS || '8');
  const timeoutMinutes = sessionDurationHours * 60; // Convert hours to minutes
  const warningMinutes = parseInt(process.env.NEXT_PUBLIC_IDLE_WARNING_MINUTES || '10'); // 10 minutes warning
  
  useIdleTimeout({
    timeoutMinutes,
    showWarningMinutes: warningMinutes,
    onWarning: handleWarning,
    onLogout: handleLogout
  });

  // Reset warning state when user interacts
  useEffect(() => {
    const handleUserActivity = () => {
      if (warningShownRef.current) {
        console.log('🔄 User activity detected, dismissing warning modal');
        warningShownRef.current = false;
        setShowWarning(false);
      }
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'focus'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, []);

  return (
    <IdleWarningModal
      isOpen={showWarning}
      onStayLoggedIn={handleStayLoggedIn}
      onLogout={handleLogout}
      timeRemaining={warningMinutes * 60} // Convert minutes to seconds
    />
  );
} 