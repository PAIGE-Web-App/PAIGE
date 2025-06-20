'use client';

import { useAuth } from '../contexts/AuthContext';
import TopNav from './TopNav';
import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AuthenticatedNavWrapper() {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  // Check if user is onboarded
  useEffect(() => {
    if (!user) {
      console.log('🔍 [AuthenticatedNavWrapper] No user, setting onboarded to null');
      setOnboarded(null);
      setOnboardingLoading(false);
      return;
    }

    console.log('🔍 [AuthenticatedNavWrapper] Setting up real-time listener for user:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
    setOnboardingLoading(true);

    // Set up real-time listener to user document
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ [AuthenticatedNavWrapper] User document exists, data:', {
          onboarded: userData.onboarded,
          email: userData.email,
          displayName: userData.displayName,
          hasProfileImage: !!userData.profileImageUrl,
          createdAt: userData.createdAt,
          fullData: userData
        });
        setOnboarded(!!userData.onboarded);
      } else {
        console.log('❌ [AuthenticatedNavWrapper] User document does not exist for:', user.uid);
        setOnboarded(false);
      }
      setOnboardingLoading(false);
    }, (error) => {
      console.error('❌ [AuthenticatedNavWrapper] Error listening to user document:', {
        error: error.message,
        code: error.code,
        userUid: user.uid
      });
      setOnboarded(false);
      setOnboardingLoading(false);
    });

    return () => {
      console.log('🔍 [AuthenticatedNavWrapper] Cleaning up listener for user:', user.uid);
      unsubscribe();
    };
  }, [user, user?.uid]);

  // Don't render anything while loading to avoid flashing
  if (loading || onboardingLoading) {
    console.log('⏳ [AuthenticatedNavWrapper] Loading state, not rendering');
    return null;
  }

  // Only render TopNav for authenticated AND onboarded users
  if (!user || !onboarded) {
    console.log('🚫 [AuthenticatedNavWrapper] Not rendering nav - user:', !!user, 'onboarded:', onboarded);
    return null;
  }

  console.log('✅ [AuthenticatedNavWrapper] Rendering TopNav for user:', user.email);
  return <TopNav />;
} 