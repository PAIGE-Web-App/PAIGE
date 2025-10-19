'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
// Get token refresh interval from environment (default: 10 minutes)
const TOKEN_REFRESH_INTERVAL = (parseInt(process.env.TOKEN_REFRESH_INTERVAL_MINUTES || '10')) * 60 * 1000;

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
  
  // Email verification status
  emailVerified: boolean;
  needsEmailVerification: boolean;
  provider: 'google' | 'email' | null;
  
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
  
  // Email verification status
  emailVerified: false,
  needsEmailVerification: false,
  provider: null,
  
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
  
  // Email verification state
  const [emailVerified, setEmailVerified] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [provider, setProvider] = useState<'google' | 'email' | null>(null);
  

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


  // Cache for user data to prevent excessive Firestore reads
  const userDataCache = useRef<{ [userId: string]: any }>({});
  const lastFetchRef = useRef<{ [userId: string]: number }>({});
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Always prefer Firestore value over localStorage after Firestore loads
  useEffect(() => {
    if (!loading && user) {
      (async () => {
        try {
          const userId = user.uid;
          const now = Date.now();
          
          // Check cache first to prevent excessive Firestore reads
          if (userDataCache.current[userId] && 
              lastFetchRef.current[userId] && 
              (now - lastFetchRef.current[userId]) < CACHE_TTL) {
            const cachedData = userDataCache.current[userId];
            setUserName(cachedData.userName || user.displayName || 'User');
            setProfileImageUrlState(cachedData.profileImageUrl || null);
            setProfileImageLQIPState(cachedData.profileImageLQIP || null);
            setUserRole(cachedData.role || 'couple');
            setUserType(cachedData.userType || 'couple');
            setPermissions(cachedData.permissions || null);
            setSubscription(cachedData.subscription || null);
            const adminRoles = ['moderator', 'admin', 'super_admin'];
            const isUserAdmin = adminRoles.includes(cachedData.role);
            setIsAdmin(isUserAdmin);
            setCanAccessAdmin(isUserAdmin);
            return;
          }

          // Use the new role-aware user fetching
          const userData = await getUserWithRole(user.uid);
          
          // Cache the result to prevent future reads
          userDataCache.current[userId] = userData;
          lastFetchRef.current[userId] = now;
          
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

  // Check email verification status
  const checkEmailVerificationStatus = async (user: User) => {
    try {
      // Get user document from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // Detect provider: check for Google tokens or Gmail connection
        let provider: 'google' | 'email' = 'email';
        if (userData.googleTokens || userData.gmailConnected || userData.provider === 'google') {
          provider = 'google';
        } else if (userData.provider) {
          provider = userData.provider;
        }
        
        // For Google OAuth users, they're automatically verified
        // For manual email users, check the emailVerified field
        const emailVerified = provider === 'google' ? true : (userData.emailVerified || false);
        
        setProvider(provider);
        setEmailVerified(emailVerified);
        
        // Determine if user needs email verification
        // Google OAuth users are pre-verified, manual email users need verification
        const needsVerification = provider === 'email' && !emailVerified;
        setNeedsEmailVerification(needsVerification);
      } else {
        // User document doesn't exist, default to email verification required
        setProvider('email');
        setEmailVerified(false);
        setNeedsEmailVerification(true);
      }
    } catch (error) {
      console.error('Error checking email verification status:', error);
      // Default to requiring verification on error
      setProvider('email');
      setEmailVerified(false);
      setNeedsEmailVerification(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Auth state changed
      setUser(user);
      setLoading(false);
      
      // If user exists, validate session and set up token refresh
      if (user) {
        await checkOnboardingStatus();
        
        // Check email verification status
        await checkEmailVerificationStatus(user);
        
        // Note: Redirect logic moved back to login page for better control
        
        const refreshInterval = setInterval(async () => {
          if (user && user.uid) {
            await refreshAuthTokenLocal();
          }
        }, TOKEN_REFRESH_INTERVAL);
        return () => clearInterval(refreshInterval);
      } else {
        // Clear onboarding status when user logs out
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ONBOARDING_STATUS_KEY);
        }
      }
    });
    
    return unsubscribe;
  }, [refreshAuthTokenLocal]);

  // Loading is now handled by LoadingProvider in layout.tsx

  // Memoize the context value to ensure proper re-renders when state changes
  const contextValue = useMemo(() => ({
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
    emailVerified,
    needsEmailVerification,
    provider,
    refreshAuthToken: refreshAuthTokenLocal,
    validateSession: validateSessionLocal,
  }), [
    user, 
    loading, 
    userName, 
    profileImageUrl, 
    profileImageLQIP, 
    userRole,
    userType,
    permissions,
    subscription,
    isAdmin,
    canAccessAdmin,
    onboardingStatus,
    emailVerified,
    needsEmailVerification, // 🎯 Key dependency
    provider,
    refreshAuthTokenLocal,
    validateSessionLocal,
    updateUser,
    refreshUserRole,
    checkOnboardingStatus,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 