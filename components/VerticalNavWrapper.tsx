'use client';

import { useAuth } from '../contexts/AuthContext';
import VerticalNav from './VerticalNav';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface VerticalNavWrapperProps {
  children: React.ReactNode;
}

export default function VerticalNavWrapper({ children }: VerticalNavWrapperProps) {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  // Check if user is onboarded
  useEffect(() => {
    if (!user) {

      setOnboarded(null);
      setOnboardingLoading(false);
      return;
    }

    
    setOnboardingLoading(true);

    // Set up real-time listener to user document
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();

        setOnboarded(!!userData.onboarded);
      } else {

        setOnboarded(false);
      }
      setOnboardingLoading(false);
    }, (error) => {
      console.error('❌ [VerticalNavWrapper] Error listening to user document:', {
        error: error.message,
        code: error.code,
        userUid: user.uid
      });
      setOnboarded(false);
      setOnboardingLoading(false);
    });

    return () => {
      
      unsubscribe();
    };
  }, [user, user?.uid]);

  // Don't render anything while loading to avoid flashing
  if (loading || onboardingLoading) {
    return <div className="min-h-screen">{children}</div>;
  }

  // Only render VerticalNav for authenticated AND onboarded users
  if (!user || !onboarded) {
    console.log('🚫 [VerticalNavWrapper] Not rendering nav - user:', !!user, 'onboarded:', onboarded);
    return <div className="min-h-screen">{children}</div>;
  }

  
  return (
    <div className="flex min-h-screen">
      <VerticalNav />
      <main className="flex-1 md:ml-[72px]">
        {children}
      </main>
    </div>
  );
} 