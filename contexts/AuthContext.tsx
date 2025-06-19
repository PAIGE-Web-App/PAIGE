'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const PROFILE_IMAGE_KEY = 'paige_profile_image_url';
const PROFILE_IMAGE_LQIP_KEY = 'paige_profile_image_lqip';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profileImageUrl: string | null;
  setProfileImageUrl: (url: string | null) => void;
  profileImageLQIP: string | null;
  setProfileImageLQIP: (lqip: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profileImageUrl: null,
  setProfileImageUrl: () => {},
  profileImageLQIP: null,
  setProfileImageLQIP: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileImageUrl, setProfileImageUrlState] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(PROFILE_IMAGE_KEY) : null
  );
  const [profileImageLQIP, setProfileImageLQIPState] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(PROFILE_IMAGE_LQIP_KEY) : null
  );

  useEffect(() => {
    if (profileImageUrl) {
      localStorage.setItem(PROFILE_IMAGE_KEY, profileImageUrl);
    } else {
      localStorage.removeItem(PROFILE_IMAGE_KEY);
    }
  }, [profileImageUrl]);

  useEffect(() => {
    if (profileImageLQIP) {
      localStorage.setItem(PROFILE_IMAGE_LQIP_KEY, profileImageLQIP);
    } else {
      localStorage.removeItem(PROFILE_IMAGE_LQIP_KEY);
    }
  }, [profileImageLQIP]);

  const setProfileImageUrl = (url: string | null) => {
    setProfileImageUrlState(url);
    if (url) {
      localStorage.setItem(PROFILE_IMAGE_KEY, url);
    } else {
      localStorage.removeItem(PROFILE_IMAGE_KEY);
    }
  };
  const setProfileImageLQIP = (lqip: string | null) => {
    setProfileImageLQIPState(lqip);
    if (lqip) {
      localStorage.setItem(PROFILE_IMAGE_LQIP_KEY, lqip);
    } else {
      localStorage.removeItem(PROFILE_IMAGE_LQIP_KEY);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfileImageUrl(userDoc.data().profileImageUrl || null);
          setProfileImageLQIP(userDoc.data().profileImageLQIP || null);
        } else {
          setProfileImageUrl(null);
          setProfileImageLQIP(null);
        }
      } else {
        setProfileImageUrl(null);
        setProfileImageLQIP(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, profileImageUrl, setProfileImageUrl, profileImageLQIP, setProfileImageLQIP }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 