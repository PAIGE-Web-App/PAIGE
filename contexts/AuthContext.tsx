'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, onAuthStateChanged, getIdToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getUserWithRole } from '@/utils/userRoleMigration';
import { UserRole, UserType, UserPermissions, UserSubscription } from '@/types/user';
import LoadingSpinner from '@/components/LoadingSpinner';
import { refreshAuthToken, validateSession } from '@/utils/authUtils';

const PROFILE_IMAGE_KEY = 'paige_profile_image_url';
const PROFILE_IMAGE_LQIP_KEY = 'paige_profile_image_lqip';
const ONBOARDING_STATUS_KEY = 'paige_onboarding_status';
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Extend the existing context with role information
interface AuthContextType {
  user: User | null;
  loading: boolean;
  userName: string | null;
  profileImageUrl: string | null;
  setProfileImageUrl: (url: string | null) => void;
  profileImageLQIP: string | null;
  setProfileImageLQIP: (lqip: string | null) => void;
  updateUser: (newUserData: Partial<{ userName: string; profileImageUrl: string; profileImageLQIP: string }>) => void;
  
  // New role system fields
  userRole: UserRole;
  userType: UserType;
  permissions: UserPermissions | null;
  subscription: UserSubscription | null;
  isAdmin: boolean;
  canAccessAdmin: boolean;
  refreshUserRole: () => Promise<void>;
  
  // Onboarding status
  onboardingStatus: 'unknown' | 'onboarded' | 'not-onboarded';
  checkOnboardingStatus: () => Promise<void>;
  
  // New authentication management
  refreshAuthToken: () => Promise<string | null>;
  validateSession: () => Promise<boolean>;
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
  
  // New role system fields
  userRole: 'couple' as UserRole,
  userType: 'couple' as UserType,
  permissions: null,
  subscription: null,
  isAdmin: false,
  canAccessAdmin: false,
  refreshUserRole: async () => {},
  
  // Onboarding status
  onboardingStatus: 'unknown',
  checkOnboardingStatus: async () => {},
  
  // New authentication management
  refreshAuthToken: async () => null,
  validateSession: async () => false,
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
  
  // Role system state
  const [userRole, setUserRole] = useState<UserRole>('couple');
  const [userType, setUserType] = useState<UserType>('couple');
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  
  // Onboarding status state
  const [onboardingStatus, setOnboardingStatus] = useState<'unknown' | 'onboarded' | 'not-onboarded'>(
    typeof window !== 'undefined' ? (localStorage.getItem(ONBOARDING_STATUS_KEY) as any) || 'unknown' : 'unknown'
  );

  // Track last operation timestamps to prevent loops
  const lastTokenRefreshRef = useRef<number>(0);
  const lastSessionValidationRef = useRef<number>(0);

  // Token refresh function - using utility function
  const refreshAuthTokenLocal = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    
    // Prevent rapid token refresh attempts
    const now = Date.now();
    if (now - lastTokenRefreshRef.current < 30000) { // 30 seconds minimum between refreshes
      return null;
    }
    
    try {
      const result = await refreshAuthToken(user);
      if (result) {
        // Update last refresh time
        lastTokenRefreshRef.current = now;
      }
      return result;
    } catch (error) {
      console.error('Error in local token refresh:', error);
      return null;
    }
  }, [user]);

  // Session validation function - using utility function
  const validateSessionLocal = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    // Prevent rapid validation attempts
    const now = Date.now();
    if (now - lastSessionValidationRef.current < 10000) { // 10 seconds minimum between validations
      return true; // Assume valid to prevent loops
    }
    
    try {
      const result = await validateSession(user);
      // Update last validation time
      lastSessionValidationRef.current = now;
      return result;
    } catch (error) {
      console.error('Error in local session validation:', error);
      return false;
    }
  }, [user]);

  // Always prefer Firestore value over localStorage after Firestore loads
  useEffect(() => {
    if (!loading && user) {
      (async () => {
        try {
          // Use the new role-aware user fetching
          const userData = await getUserWithRole(user.uid);
          if (userData) {
            setUserName(userData.userName || user.displayName || 'User');
            setProfileImageUrlState(userData.profileImageUrl || null);
            setProfileImageLQIPState(userData.profileImageLQIP || null);
            
            // Set role system data
            setUserRole(userData.role || 'couple');
            setUserType(userData.userType || 'couple');
            setPermissions(userData.permissions || null);
            setSubscription(userData.subscription || null);
            
            // Calculate admin access
            const adminRoles = ['moderator', 'admin', 'super_admin'];
            const isUserAdmin = adminRoles.includes(userData.role);
            setIsAdmin(isUserAdmin);
            setCanAccessAdmin(isUserAdmin);
          } else {
            setUserName(user.displayName || 'User');
            setProfileImageUrlState(null);
            setProfileImageLQIPState(null);
            
            // Set default role system data
            setUserRole('couple');
            setUserType('couple');
            setPermissions(null);
            setSubscription(null);
            setIsAdmin(false);
            setCanAccessAdmin(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback to basic user data
          setUserName(user.displayName || 'User');
          setProfileImageUrlState(null);
          setProfileImageLQIPState(null);
          
          // Set default role system data
          setUserRole('couple');
          setUserType('couple');
          setPermissions(null);
          setSubscription(null);
          setIsAdmin(false);
          setCanAccessAdmin(false);
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

  // Function to force refresh user role data
  const refreshUserRole = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Refreshing user role data...');
      const userData = await getUserWithRole(user.uid);
      if (userData) {
        setUserName(userData.userName || user.displayName || 'User');
        setProfileImageUrlState(userData.profileImageUrl || null);
        setProfileImageLQIPState(userData.profileImageLQIP || null);
        
        // Set role system data
        setUserRole(userData.role || 'couple');
        setUserType(userData.userType || 'couple');
        setPermissions(userData.permissions || null);
        setSubscription(userData.subscription || null);
        
        // Calculate admin access
        const adminRoles = ['moderator', 'admin', 'super_admin'];
        const isUserAdmin = adminRoles.includes(userData.role);
        setIsAdmin(isUserAdmin);
        setCanAccessAdmin(isUserAdmin);
        
        console.log('✅ Role refreshed:', userData.role, 'Admin:', isUserAdmin);
      }
    } catch (error) {
      console.error('Error refreshing user role:', error);
    }
  };

  // Function to check onboarding status
  const checkOnboardingStatus = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        const isOnboarded = data.onboarded === true;
        const newStatus = isOnboarded ? 'onboarded' : 'not-onboarded';
        
        setOnboardingStatus(newStatus);
        localStorage.setItem(ONBOARDING_STATUS_KEY, newStatus);
      } else {
        setOnboardingStatus('not-onboarded');
        localStorage.setItem(ONBOARDING_STATUS_KEY, 'not-onboarded');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setOnboardingStatus('not-onboarded');
      localStorage.setItem(ONBOARDING_STATUS_KEY, 'not-onboarded');
    }
  };

  useEffect(() => {
    let authStateChangeTimeout: NodeJS.Timeout;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Debounce rapid auth state changes (especially during logout)
      clearTimeout(authStateChangeTimeout);
      authStateChangeTimeout = setTimeout(async () => {
        // Auth state changed
        setUser(user);
        setLoading(false);
        
        // If user exists, validate session and set up token refresh
        if (user) {
          // Don't validate session immediately to avoid redirect loops
          // The session will be validated on the next page load
          
          // Set up periodic token refresh
          const refreshInterval = setInterval(async () => {
            if (user && user.uid) {
              await refreshAuthTokenLocal();
            }
          }, TOKEN_REFRESH_INTERVAL);
          
          // Clean up interval on unmount
          return () => clearInterval(refreshInterval);
        }
      }, 100); // 100ms debounce
    });
    
    return () => {
      clearTimeout(authStateChangeTimeout);
      unsubscribe();
    };
  }, [validateSession, refreshAuthToken]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userName, 
      profileImageUrl, 
      setProfileImageUrl, 
      profileImageLQIP, 
      setProfileImageLQIP, 
      updateUser,
      userRole,
      userType,
      permissions,
      subscription,
      isAdmin,
      canAccessAdmin,
      refreshUserRole,
      onboardingStatus,
      checkOnboardingStatus,
      refreshAuthToken: refreshAuthTokenLocal,
      validateSession: validateSessionLocal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 