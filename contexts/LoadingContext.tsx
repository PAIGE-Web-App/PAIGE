'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useCredits } from './CreditContext';
import UnifiedLoadingScreen from '../components/UnifiedLoadingScreen';

interface LoadingState {
  auth: boolean;
  credits: boolean;
  onboarding: boolean;
  profile: boolean;
  data: boolean;
}

interface LoadingContextType {
  isLoading: boolean;
  loadingState: LoadingState;
  setLoadingState: (state: Partial<LoadingState>) => void;
  getLoadingMessage: () => string;
  getLoadingProgress: () => number;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, onboardingStatus } = useAuth();
  const { loading: creditsLoading } = useCredits();
  
  const [loadingState, setLoadingStateInternal] = useState<LoadingState>({
    auth: true,
    credits: true,
    onboarding: true,
    profile: true,
    data: true,
  });

  const setLoadingState = useCallback((updates: Partial<LoadingState>) => {
    setLoadingStateInternal(prev => ({ ...prev, ...updates }));
  }, []);

  // Update loading states based on context values
  useEffect(() => {
    setLoadingState({
      auth: authLoading,
      credits: creditsLoading,
      onboarding: onboardingStatus === 'unknown',
      profile: false, // Profile loading is handled by individual pages
      data: false, // Data loading is handled by individual pages
    });
  }, [authLoading, creditsLoading, onboardingStatus, setLoadingState]);

  const isLoading = Object.values(loadingState).some(Boolean);

  const getLoadingMessage = useCallback(() => {
    if (loadingState.auth) return "Loading your Dream Day Details...";
    if (loadingState.onboarding) return "Loading your Dream Day Details...";
    if (loadingState.credits) return "Loading your Dream Day Details...";
    if (loadingState.profile) return "Loading your Dream Day Details...";
    if (loadingState.data) return "Loading your Dream Day Details...";
    return "Loading your Dream Day Details...";
  }, [loadingState]);

  const getLoadingProgress = useCallback(() => {
    const totalSteps = 5;
    const remainingSteps = Object.values(loadingState).filter(Boolean).length;
    const completedSteps = totalSteps - remainingSteps;
    return (completedSteps / totalSteps) * 100;
  }, [loadingState]);

  const contextValue: LoadingContextType = {
    isLoading,
    loadingState,
    setLoadingState,
    getLoadingMessage,
    getLoadingProgress,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {isLoading ? (
        <UnifiedLoadingScreen 
          message={getLoadingMessage()}
          showProgress={true}
          progress={getLoadingProgress()}
        />
      ) : (
        children
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
