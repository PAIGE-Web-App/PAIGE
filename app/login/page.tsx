// page.tsx (Login/Onboarding)
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import OnboardingVisual from "../../components/OnboardingVisual";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from '../../hooks/useAuth';
import { useCustomToast } from '../../hooks/useCustomToast';
import { useAuthError } from '../../hooks/useAuthError';
import { signInWithEmailAndPassword } from "firebase/auth";
import { ChevronDown, RefreshCw } from 'lucide-react';
import GmailLoginReauthBanner from "../../components/GmailLoginReauthBanner";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { error, handleError, clearError, getErrorMessage } = useAuthError();

  // Google account detection state
  const [googleAccount, setGoogleAccount] = useState<{
    email: string;
    name: string;
    picture: string;
    userId?: string;
  } | null>(null);
  const [detectingGoogleAccount, setDetectingGoogleAccount] = useState(true);
  
  // COMMENTED OUT: Gmail re-authentication state (no longer needed)
  // const [showGmailReauthBanner, setShowGmailReauthBanner] = useState(false);
  // const [checkingGmailAuth, setCheckingGmailAuth] = useState(false);
  // const [needsGmailReauth, setNeedsGmailReauth] = useState(false);

  // Simplified loading state
  const isLoading = loading || googleLoading;

  // Enhanced error handling is now provided by useAuthError hook

  // Consistent redirect function
  const redirectTo = (path: string) => {
    window.location.href = path;
  };

  // Check for toast message in cookies
  useEffect(() => {
    const cookieMatch = document.cookie.match(/show-toast=([^;]+)/);
    const toastValue = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    const fromRedirect = document.referrer && !document.referrer.endsWith('/login') && !document.referrer.endsWith('/signup');
    if (toastValue) {
      if (toastValue === 'Please login to access this page' && fromRedirect) {
        showErrorToast('Please login to access this page');
      } else if (toastValue === 'Log out successful!') {
        showSuccessToast('Log out successful!');
      }
      document.cookie = 'show-toast=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }, []);

  // COMMENTED OUT: Auto-redirect to debug session cookie issue
  // Redirect if already logged in - but only if not in the middle of Google login
  /*
  useEffect(() => {
    if (user && !googleLoading && !loading) {
      console.log('🔄 Auto-redirect detected, user:', user.email, 'uid:', user.uid);
      
      // Add a small delay to prevent rapid redirects during authentication
      const timeoutId = setTimeout(async () => {
        console.log('🔄 Auto-redirect timeout triggered, setting session cookie first');
        
        try {
          // FIRST: Set the session cookie
          console.log('🔑 Auto-redirect - Getting ID token...');
          const idToken = await user.getIdToken();
          console.log('🔑 Auto-redirect - Got ID token, length:', idToken.length);
          console.log('🔑 Auto-redirect - ID token preview:', idToken.substring(0, 50) + '...');
          
          console.log('📡 Auto-redirect - Calling /api/sessionLogin...');
          const sessionRes = await fetch("/api/sessionLogin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
            credentials: "include",
          });
          
          console.log('📡 Auto-redirect - Session login response:', {
            ok: sessionRes.ok,
            status: sessionRes.status,
            statusText: sessionRes.statusText,
            headers: Object.fromEntries(sessionRes.headers.entries())
          });
          
          // Check if Set-Cookie header is present
          const setCookieHeader = sessionRes.headers.get('set-cookie');
          console.log('🍪 Auto-redirect - Set-Cookie header:', setCookieHeader);
          
          if (!sessionRes.ok) {
            const errorText = await sessionRes.text();
            console.error('❌ Auto-redirect - Session login failed:', errorText);
          } else {
            console.log('✅ Auto-redirect - Session login successful');
            const responseData = await sessionRes.json();
            console.log('📄 Auto-redirect - Session login response data:', responseData);
            
            // Check cookies after the request
            console.log('🍪 Auto-redirect - Cookies after request:', document.cookie);
          }
        } catch (error) {
          console.error('❌ Auto-redirect - Error setting session cookie:', error);
        }
        
        // THEN: Check if user is onboarded before redirecting
        const checkOnboarding = async () => {
          try {
            console.log('🔍 Auto-redirect - Checking onboarding status...');
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              console.log('📄 Auto-redirect - User data:', { onboarded: userData.onboarded });
              if (userData.onboarded === true) {
                console.log('🏠 Auto-redirect - User is onboarded, redirecting to dashboard');
                redirectTo("/");
              } else {
                console.log('📝 Auto-redirect - User not onboarded, redirecting to signup');
                redirectTo('/signup?onboarding=1');
              }
            } else {
              console.log('❌ Auto-redirect - User doc does not exist, redirecting to signup');
              redirectTo('/signup?existing=1');
            }
          } catch (error) {
            console.error('❌ Auto-redirect - Error checking onboarding status:', error);
            redirectTo("/");
          }
        };
        
        checkOnboarding();
      }, 2000); // Increased delay to give more time for debugging
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, googleLoading, loading]); // Removed router from dependencies
  */

  useEffect(() => {
    if (searchParams?.get && searchParams.get("existing")) {
      showErrorToast("Looks like you're already a user. Please log in.");
    }
  }, [searchParams, showErrorToast]);

  // COMMENTED OUT: Detect if user is already signed into Google
  // This was causing too many issues with session cookie management
  /*
  useEffect(() => {
    const detectGoogleAccount = async () => {
      try {
        setDetectingGoogleAccount(true);
        
        // Check if the user has previously signed in with Google
        const lastSignInMethod = localStorage.getItem('lastSignInMethod');
        const lastGoogleEmail = localStorage.getItem('lastGoogleEmail');
        const lastGoogleName = localStorage.getItem('lastGoogleName');
        const lastGooglePicture = localStorage.getItem('lastGooglePicture');
        const lastGoogleUserId = localStorage.getItem('lastGoogleUserId');
        
        if (lastSignInMethod === 'google' && lastGoogleEmail) {
          const accountInfo = {
            email: lastGoogleEmail,
            name: lastGoogleName || lastGoogleEmail.split('@')[0],
            picture: lastGooglePicture || '',
            userId: lastGoogleUserId || undefined
          };
          
          setGoogleAccount(accountInfo);
          
          // Check Gmail authentication status if we have a user ID
          if (lastGoogleUserId) {
            await checkGmailAuthStatus(lastGoogleUserId);
          }
        }
      } catch (error) {
  
      } finally {
        setDetectingGoogleAccount(false);
      }
    };

    detectGoogleAccount();
  }, []);
  */

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // COMMENTED OUT: Check Gmail authentication status (no longer needed)
  /*
  const checkGmailAuthStatus = async (userId: string) => {
    try {
      setCheckingGmailAuth(true);
      const response = await fetch('/api/check-gmail-auth-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      const data = await response.json();
      
      if (data.needsReauth) {
        setShowGmailReauthBanner(true);
        setNeedsGmailReauth(true);
      }
    } catch (error) {
      console.error('Error checking Gmail auth status:', error);
    } finally {
      setCheckingGmailAuth(false);
    }
  };
  */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email || !password) {
      handleError({ code: 'MISSING_FIELDS', message: 'All fields are required' }, 'Form validation');
      return;
    }
    if (!emailRegex.test(email)) {
      handleError({ code: 'INVALID_EMAIL', message: 'Please enter a valid email address' }, 'Form validation');
      return;
    }
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      const idToken = await result.user.getIdToken();
      // Call sessionLogin to set the __session cookie
      const sessionRes = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      if (!sessionRes.ok) {
        const authError = handleError({ code: 'SESSION_FAILED', message: 'Failed to establish session' }, 'Session login');
        showErrorToast(getErrorMessage(authError));
        setLoading(false);
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('showLoginToast', '1');
      }
      
      // Check if user exists in Firestore before redirecting
      const userDocRef = doc(db, "users", result.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.onboarded === true) {
          redirectTo("/");
        } else {
          redirectTo('/signup?onboarding=1');
        }
      } else {
        redirectTo('/signup?existing=1');
      }
    } catch (error: any) {
      const authError = handleError(error, 'Email login');
      showErrorToast(getErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  };

  // COMMENTED OUT: Continue as Google function
  // This was causing too many issues with session cookie management
  /*
  const handleContinueAsGoogle = async () => {
    // If Gmail re-authentication is needed, handle that first
    if (needsGmailReauth && googleAccount?.userId) {
      const reauthUrl = `/api/auth/google/initiate?userId=${googleAccount.userId}&redirectUri=${encodeURIComponent(window.location.href)}`;
      window.open(reauthUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // For "Continue as" - try to use existing session first
    try {
      setGoogleLoading(true);
      
      console.log('🔍 Continue as Google - Debug info:', {
        hasCurrentUser: !!auth.currentUser,
        currentUserEmail: auth.currentUser?.email,
        googleAccountEmail: googleAccount?.email,
        emailsMatch: auth.currentUser?.email === googleAccount?.email
      });
      
      // Check if user is already authenticated with Google
      if (auth.currentUser && auth.currentUser.email === googleAccount?.email) {
        console.log('✅ User is already authenticated, proceeding with session login');
        
        // User is already authenticated, proceed with session login
        const idToken = await auth.currentUser.getIdToken();
        console.log('🔑 Got ID token, length:', idToken.length);
        
        // Check if user doc exists in Firestore
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          console.log('❌ User doc does not exist in Firestore');
          redirectTo('/signup?existing=1');
          return;
        }
        
        console.log('📝 Calling /api/sessionLogin with ID token');
        // POST the ID token to your session login API
        const res = await fetch("/api/sessionLogin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include", // Important: include cookies
        });
        
        console.log('📡 Session login response:', {
          ok: res.ok,
          status: res.status,
          statusText: res.statusText
        });
        
        if (res.ok) {
          console.log('✅ Session login successful, checking onboarding status');
          // Check onboarding status before redirecting
          const userData = userDocSnap.data();
          if (userData.onboarded === true) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('showLoginToast', '1');
            }
            redirectTo("/");
          } else {
            redirectTo('/signup?onboarding=1');
          }
        } else {
          const errorText = await res.text();
          console.error('❌ Session login failed:', errorText);
          // Fall back to fresh Google login
          await handleFreshGoogleLogin();
        }
      } else {
        console.log('❌ No existing session or email mismatch, falling back to fresh login');
        // No existing session, fall back to fresh Google login
        await handleFreshGoogleLogin();
      }
    } catch (error) {
      console.error('❌ Error in Continue as Google:', error);
      const authError = handleError(error, 'Continue as Google login');
      showErrorToast(getErrorMessage(authError));
      // Fall back to fresh Google login
      await handleFreshGoogleLogin();
    } finally {
      setGoogleLoading(false);
    }
  };
  */

  const handleFreshGoogleLogin = async () => {
    // Fresh Google login with popup
    const provider = new GoogleAuthProvider();
    
    // Force account selection - this is how other companies handle it
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Add Gmail scopes for automatic Gmail connection
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    provider.addScope('https://www.googleapis.com/auth/calendar');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    
    try {
      setGoogleLoading(true);
      const result = await signInWithPopup(auth, provider);
      
      // Don't save Google account info to localStorage yet - let the auth state handle the redirect
      // This prevents the page from showing "Continue as" button after popup completes
      
      // Store Gmail tokens from the login popup
      try {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;
        
        if (accessToken) {
          // Store Gmail tokens in Firestore (matching API expected format)
          const gmailTokens = {
            accessToken: accessToken,
            refreshToken: null, // Firebase popup doesn't provide refresh token
            expiryDate: Date.now() + 3600 * 1000, // 1 hour from now
            email: result.user.email, // Store Gmail account email
            scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
          };
          
          // Check if user exists before updating
          const userDocRef = doc(db, "users", result.user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            // Update user document with Gmail tokens
            await updateDoc(userDocRef, {
              googleTokens: gmailTokens,
              gmailConnected: true,
            });
          }
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('gmailConnected', 'true');
          }
        } else {
          // Check existing Gmail auth status as fallback
          const gmailResponse = await fetch('/api/check-gmail-auth-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: result.user.uid }),
          });
          const gmailData = await gmailResponse.json();
          const hasGmailTokens = gmailData.needsReauth === false;
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('gmailConnected', hasGmailTokens.toString());
          }
        }
      } catch (error) {
        console.error('Error storing Gmail tokens during login:', error);
        // Check existing Gmail auth status as fallback
        try {
          const gmailResponse = await fetch('/api/check-gmail-auth-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: result.user.uid }),
          });
          const gmailData = await gmailResponse.json();
          const hasGmailTokens = gmailData.needsReauth === false;
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('gmailConnected', hasGmailTokens.toString());
          }
        } catch (fallbackError) {
          console.error('Error checking Gmail auth status during login:', fallbackError);
        }
      }
      
      // Check if user doc exists in Firestore BEFORE session login
      const userDocRef = doc(db, "users", result.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        // User doesn't exist in Firestore, redirect to signup immediately
        redirectTo('/signup?existing=1');
        return;
      }
      
      const idToken = await result.user.getIdToken();
      // Get ID token and call session login
      // POST the ID token to your session login API
      const res = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include", // Important: include cookies
      });
      
      // Check session login response
      
      if (res.ok) {
        // Get the session token from the response
        const sessionData = await res.json();
        
        // Set the client-side session cookie
        if (typeof window !== 'undefined' && sessionData.sessionToken) {
          document.cookie = `__client_session=${sessionData.sessionToken}; Path=/; Max-Age=432000; SameSite=Lax`;
        }
        
        // Save Google account info for future detection after successful authentication
        localStorage.setItem('lastSignInMethod', 'google');
        localStorage.setItem('lastGoogleEmail', result.user.email || '');
        localStorage.setItem('lastGoogleName', result.user.displayName || '');
        localStorage.setItem('lastGooglePicture', result.user.photoURL || '');
        localStorage.setItem('lastGoogleUserId', result.user.uid);
        
        // Check onboarding status before redirecting
        const userData = userDocSnap.data();
        
        // Redirect based on onboarding status
        if (userData.onboarded === true) {
          // User is onboarded, redirect to dashboard
          if (typeof window !== 'undefined') {
            localStorage.setItem('showLoginToast', '1');
          }
          redirectTo("/");
        } else {
          // User is not onboarded, redirect to signup
          redirectTo('/signup?onboarding=1');
        }
      } else {
        const errorText = await res.text();
        console.error('Session login failed:', errorText);
        showErrorToast("Session login failed");
      }
    } catch (err: any) {
      // Handle special case for existing account
      if (err.code === "auth/account-exists-with-different-credential") {
        showErrorToast("An account already exists with this email. Redirecting to login...");
        setTimeout(() => {
          redirectTo("/login?existing=1");
        }, 2000);
        return;
      }
      
      const authError = handleError(err, 'Fresh Google login');
      showErrorToast(getErrorMessage(authError));
    } finally {
      setGoogleLoading(false);
    }
  };

  // Keep the old function for backward compatibility
  const handleGoogleLogin = handleFreshGoogleLogin;

  // COMMENTED OUT: Function to clear Google account and switch to email sign-in (no longer needed)
  /*
  const handleSwitchToEmail = () => {
    setGoogleAccount(null);
    setShowGmailReauthBanner(false);
    // Clear stored Google account data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lastSignInMethod');
      localStorage.removeItem('lastGoogleEmail');
      localStorage.removeItem('lastGoogleName');
      localStorage.removeItem('lastGooglePicture');
      localStorage.removeItem('lastGoogleUserId');
    }
  };
  */

  // COMMENTED OUT: Handle Gmail re-authentication success (no longer needed)
  /*
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailAuth = params.get('gmailAuth');
    const userId = params.get('userId');

    if (gmailAuth === 'success' && userId) {
      // Clear URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Hide the reauth banner and reset state
      setShowGmailReauthBanner(false);
      setNeedsGmailReauth(false);
      
      // Show success toast
      showSuccessToast('Gmail re-authentication successful! Please Login.');
      
      // Note: Gmail re-authentication and user login are separate processes
      // Users need to manually complete the login flow
    }
  }, [googleAccount]);
  */

  // State to control whether to show email form
  const [showEmailForm, setShowEmailForm] = useState(false);

  return (
    <div className="min-h-screen bg-[#F3F2F0] flex justify-center">
      <div className="w-full max-w-[1280px] flex">
        <div className="w-[40%] min-w-[400px] flex flex-col justify-center items-start px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
            {step === 1 && (
              <>
                <div className="flex flex-col justify-center items-center px-12">
                    <div className="text-[#AB9C95] text-2xl font-playfair mb-4">Logo</div>
                    <h1 className="text-[#332B42] text-2xl font-playfair font-semibold mb-4 text-center w-full">
            Welcome back!
          </h1>
          <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-center w-full">
            Log in to your Paige account
          </h4>



                    <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
              {/* Google Login Button - Always show standard button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className={`w-full py-2 text-base font-normal rounded-[5px] flex items-center justify-center gap-2 whitespace-nowrap ${isLoading ? "bg-[#DCDCDC] cursor-not-allowed" : "btn-primaryinverse"}`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <img src="/Google__G__logo.svg" alt="Google" width="16" height="16" className="block" />
                </span>
                <span className={isLoading ? "text-xs font-semibold font-work-sans" : ""}>
                  {isLoading ? "Logging in..." : "Login with Google"}
                </span>
              </button>

              {/* Login with email option */}
              <button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="btn-primaryinverse w-full py-2 text-base font-normal rounded-[5px] whitespace-nowrap"
              >
                Login with Email
              </button>

              {/* Only show email/password form if user clicked "Sign in with email" */}
              {showEmailForm && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#AB9C95]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-[#F3F2F0] text-[#AB9C95]">or</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  
                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-800">
                            {getErrorMessage(error)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2 text-base font-normal rounded-[5px] ${isLoading ? "bg-[#DCDCDC] cursor-not-allowed" : "btn-primary"}`}
                  >
                    {isLoading ? "Logging in..." : "Log In"}
                  </button>
                </>
              )}
              
            </form>

            <p className="text-xs text-center font-work-sans text-[#332B42] mt-8">
              Don&apos;t have an account?{' '}
              <a href="/signup" className="text-[#A85C36] cursor-pointer font-medium underline hover:text-[#784528]">Sign up</a>
            </p>

            {/* <div className="mt-1 text-xs text-[#364257]">
              Are you a wedding planner?{" "}
              <button className="text-[#A85C36] underline hover:text-[#784528]">Start here</button>
            </div> */}
            </div>
              </>
            )}

            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-[60%] p-4 m-4 flex items-center justify-center">
          <OnboardingVisual altText="Wedding rings illustration" />
        </div>
      </div>
    </div>
  );
}
