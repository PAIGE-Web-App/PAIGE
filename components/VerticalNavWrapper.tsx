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
      console.log('🔍 [VerticalNavWrapper] No user, setting onboarded to null');
      setOnboarded(null);
      setOnboardingLoading(false);
      return;
    }

    console.log('🔍 [VerticalNavWrapper] Setting up real-time listener for user:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
    setOnboardingLoading(true);

    // Set up real-time listener to user document
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ [VerticalNavWrapper] User document exists, data:', {
          onboarded: userData.onboarded,
          email: userData.email,
          displayName: userData.displayName,
          hasProfileImage: !!userData.profileImageUrl,
          createdAt: userData.createdAt,
          fullData: userData
        });
        setOnboarded(!!userData.onboarded);
      } else {
        console.log('❌ [VerticalNavWrapper] User document does not exist for:', user.uid);
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
      console.log('🔍 [VerticalNavWrapper] Cleaning up listener for user:', user.uid);
      unsubscribe();
    };
  }, [user, user?.uid]);

  // Don't render anything while loading to avoid flashing
  if (loading || onboardingLoading) {
    console.log('⏳ [VerticalNavWrapper] Loading state, not rendering');
    return <div className="min-h-screen">{children}</div>;
  }

  // Only render VerticalNav for authenticated AND onboarded users
  if (!user || !onboarded) {
    console.log('🚫 [VerticalNavWrapper] Not rendering nav - user:', !!user, 'onboarded:', onboarded);
    return <div className="min-h-screen">{children}</div>;
  }

  console.log('✅ [VerticalNavWrapper] Rendering VerticalNav for user:', user.email);
  
  return (
    <div className="flex min-h-screen">
      <VerticalNav />
      <main className="flex-1 md:ml-[72px]">
        {children}
      </main>
    </div>
  );
} 