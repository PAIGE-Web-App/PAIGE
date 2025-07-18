'use client';

import React, { useState } from 'react';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import IdleWarningModal from './IdleWarningModal';
import { useCustomToast } from '@/hooks/useCustomToast';

export default function IdleTimeoutManager() {
  const [showWarning, setShowWarning] = useState(false);
  const { showInfoToast } = useCustomToast();

  const handleWarning = () => {
    setShowWarning(true);
    showInfoToast('You\'ll be logged out soon due to inactivity');
  };

  const handleStayLoggedIn = () => {
    setShowWarning(false);
  };

  const handleLogout = () => {
    setShowWarning(false);
  };

  // Use the idle timeout hook with configurable timeout
  const timeoutMinutes = parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES || '20');
  const warningMinutes = parseInt(process.env.NEXT_PUBLIC_IDLE_WARNING_MINUTES || '2');
  
  useIdleTimeout({
    timeoutMinutes,
    showWarningMinutes: warningMinutes,
    onWarning: handleWarning,
    onLogout: handleLogout
  });

  return (
    <IdleWarningModal
      isOpen={showWarning}
      onStayLoggedIn={handleStayLoggedIn}
      timeRemaining={warningMinutes * 60} // Convert minutes to seconds
    />
  );
} 