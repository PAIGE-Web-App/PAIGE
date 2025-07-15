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
  userName: string | null;
  profileImageUrl: string | null;
  setProfileImageUrl: (url: string | null) => void;
  profileImageLQIP: string | null;
  setProfileImageLQIP: (lqip: string | null) => void;
  updateUser: (newUserData: Partial<{ userName: string; profileImageUrl: string; profileImageLQIP: string }>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userName: null,
  profileImageUrl: null,
  setProfileImageUrl: () => {},
  profileImageLQIP: null,
  setProfileImageLQIP: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrlState] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(PROFILE_IMAGE_KEY) : null
  );
  const [profileImageLQIP, setProfileImageLQIPState] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(PROFILE_IMAGE_LQIP_KEY) : null
  );

  // Always prefer Firestore value over localStorage after Firestore loads
  useEffect(() => {
    if (!loading && user) {
      (async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.userName || user.displayName || 'User');
          setProfileImageUrlState(data.profileImageUrl || null);
          setProfileImageLQIPState(data.profileImageLQIP || null);
        } else {
          setUserName(user.displayName || 'User');
          setProfileImageUrlState(null);
          setProfileImageLQIPState(null);
        }
      })();
    }
  }, [loading, user]);

  useEffect(() => {
    if (profileImageUrl) {
      localStorage.setItem(PROFILE_IMAGE_KEY, profileImageUrl);
    } else {
      localStorage.removeItem(PROFILE_IMAGE_KEY);
    }
    console.log('profileImageUrl updated:', profileImageUrl);
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

  const updateUser = (newUserData: Partial<{ userName: string; profileImageUrl: string; profileImageLQIP: string }>) => {
    if (newUserData.userName !== undefined) {
      setUserName(newUserData.userName);
    }
    if (newUserData.profileImageUrl !== undefined) {
      setProfileImageUrlState(newUserData.profileImageUrl);
    }
    if (newUserData.profileImageLQIP !== undefined) {
      setProfileImageLQIPState(newUserData.profileImageLQIP);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      // Do not set profileImageUrl here, let the Firestore effect above handle it
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-12 h-12 border-4 border-[#A85C36] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, userName, profileImageUrl, setProfileImageUrl, profileImageLQIP, setProfileImageLQIP, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 