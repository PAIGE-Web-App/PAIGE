// page.tsx (Login/Onboarding)
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import OnboardingVisual from "../../components/OnboardingVisual";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from '../../hooks/useAuth';
import { useCustomToast } from '../../hooks/useCustomToast';
import { signInWithEmailAndPassword } from "firebase/auth";
import { ChevronDown, RefreshCw } from 'lucide-react';
import GmailLoginReauthBanner from "../../components/GmailLoginReauthBanner";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  // Google account detection state
  const [googleAccount, setGoogleAccount] = useState<{
    email: string;
    name: string;
    picture: string;
    userId?: string;
  } | null>(null);
  const [detectingGoogleAccount, setDetectingGoogleAccount] = useState(true);
  
  // Gmail re-authentication state
  const [showGmailReauthBanner, setShowGmailReauthBanner] = useState(false);
  const [checkingGmailAuth, setCheckingGmailAuth] = useState(false);
  const [needsGmailReauth, setNeedsGmailReauth] = useState(false);

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

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (searchParams?.get && searchParams.get("existing")) {
      showErrorToast("Looks like you're already a user. Please log in.");
    }
  }, [searchParams, showErrorToast]);

  // Detect if user is already signed into Google
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check Gmail authentication status
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("All fields are required.");
      return;
    }
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
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
        setError('Failed to establish session. Please try again.');
        showErrorToast('Failed to establish session. Please try again.');
        setLoading(false);
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('showLoginToast', '1');
      }
      
      router.push("/");
    } catch (error: any) {
      
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        setError('Email or password is incorrect.');
        showErrorToast('Email or password is incorrect.');
      } else {
        setError(error.message || 'Failed to login');
        showErrorToast(error.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSmartGoogleLogin = async () => {
    // If Gmail re-authentication is needed, handle that first
    if (needsGmailReauth && googleAccount?.userId) {
      const reauthUrl = `/api/auth/google/initiate?userId=${googleAccount.userId}&redirectUri=${encodeURIComponent(window.location.href)}`;
      window.open(reauthUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Otherwise, proceed with normal Google login
    const provider = new GoogleAuthProvider();
    try {
      setGoogleLoading(true);

      
      const result = await signInWithPopup(auth, provider);
      
      
      // Save Google account info for future detection
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastSignInMethod', 'google');
        localStorage.setItem('lastGoogleEmail', result.user.email || '');
        localStorage.setItem('lastGoogleName', result.user.displayName || '');
        localStorage.setItem('lastGooglePicture', result.user.photoURL || '');
        localStorage.setItem('lastGoogleUserId', result.user.uid);
      }
      
      const idToken = await result.user.getIdToken();
      
      
      // POST the ID token to your session login API
      const res = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      

      
      if (res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('showLoginToast', '1');
        }

        window.location.href = "/";
      } else {
        const errorText = await res.text();
        console.error('❌ [Google Login] Session login failed:', errorText);
        showErrorToast("Session login failed");
      }
    } catch (err: any) {
      console.error('❌ [Google Login] Error details:', {
        code: err.code,
        message: err.message,
        email: err.email,
        credential: err.credential,
        fullError: err
      });
      
      let message = "Google login failed. Please try again.";
      if (err.code === "auth/popup-closed-by-user") {
        message = "Sign-in popup was closed before completing the process.";
      } else if (err.code === "auth/unauthorized-domain") {
        message = "This domain is not authorized for Google sign-in.";
      } else if (err.code === "auth/operation-not-allowed") {
        message = "Google sign-in is not enabled for this app.";
      } else if (err.code === "auth/user-disabled") {
        message = "This account has been disabled.";
      } else if (err.code === "auth/user-not-found") {
        message = "User account not found.";
      } else if (err.code === "auth/invalid-credential") {
        message = "Invalid credentials.";
      } else if (err.code === "auth/account-exists-with-different-credential") {
        message = "An account already exists with the same email address but different sign-in credentials.";
      }
      
              showErrorToast(message);
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Keep the old function for backward compatibility
  const handleGoogleLogin = handleSmartGoogleLogin;

  // Function to clear Google account and switch to email sign-in
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

  // Handle Gmail re-authentication success
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
              {/* Google Login Button - Always show at top */}
              {detectingGoogleAccount || checkingGmailAuth ? (
                <div className="w-full py-3 px-4 border border-[#AB9C95] rounded-[5px] bg-white flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : googleAccount && !showEmailForm ? (
                <button
                  type="button"
                  onClick={handleSmartGoogleLogin}
                  disabled={googleLoading}
                  className={`w-full py-3 px-4 rounded-[5px] flex items-center justify-between transition-colors ${googleLoading ? "bg-[#DCDCDC] cursor-not-allowed" : "bg-[#163c57] text-white hover:bg-[#0f2a3f]"}`}
                >
                  <div className="flex items-center gap-3">
                    {googleAccount.picture ? (
                      <img 
                        src={googleAccount.picture} 
                        alt={googleAccount.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <span className="text-[#163c57] font-semibold text-sm">
                          {googleAccount.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col items-start min-w-0">
                      <span className={`font-medium text-sm truncate ${googleLoading ? "text-xs font-semibold font-work-sans" : ""}`}>
                        {googleLoading ? "Logging in..." : (needsGmailReauth ? 'Continue with Gmail' : `Continue as ${googleAccount.name}`)}
                      </span>
                      {!googleLoading && <span className="text-xs opacity-90 truncate">{googleAccount.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!googleLoading && <ChevronDown className="w-4 h-4" />}
                    <img src="/Google__G__logo.svg" alt="Google" width="16" height="16" />
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className={`w-full py-2 text-base font-normal rounded-[5px] flex items-center justify-center gap-2 whitespace-nowrap ${googleLoading ? "bg-[#DCDCDC] cursor-not-allowed" : "btn-primaryinverse"}`}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <img src="/Google__G__logo.svg" alt="Google" width="16" height="16" className="block" />
                  </span>
                  <span className={googleLoading ? "text-xs font-semibold font-work-sans" : ""}>
                    {googleLoading ? "Logging in..." : "Login with Google"}
                  </span>
                </button>
              )}

              {/* Gmail re-auth note */}
              {needsGmailReauth && (
                <p className="text-xs text-center text-[#AB9C95] mt-2">
                  Gmail access has expired. Click above to re-authenticate.
                </p>
              )}

              {/* Login with email option when Google account is detected */}
              {googleAccount && !showEmailForm && (
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="btn-primaryinverse w-full py-2 text-base font-normal rounded-[5px] whitespace-nowrap"
                >
                  Login with Email
                </button>
              )}

              {/* Only show email/password form if no Google account detected OR user clicked "Sign in with email" */}
              {(!googleAccount || showEmailForm) && (
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
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-2 text-base font-normal rounded-[5px] ${loading ? "bg-[#DCDCDC] cursor-not-allowed" : "btn-primary"}`}
                  >
                    {loading ? "Logging in..." : "Log In"}
                  </button>
                </>
              )}
              
              {/* Login with email option when Google account is detected */}
              {googleAccount && !showEmailForm && (
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="btn-primaryinverse w-full py-2 text-base font-normal rounded-[5px] whitespace-nowrap"
                >
                  Login with Email
                </button>
              )}


            </form>

            <p className="text-xs text-center font-work-sans text-[#332B42] mt-8">
              Don&apos;t have an account?{' '}
              <a href="/signup" className="text-[#A85C36] cursor-pointer font-medium underline hover:text-[#784528]">Sign up</a>
            </p>

            <div className="mt-1 text-xs text-[#364257]">
              Are you a wedding planner?{" "}
              <button className="text-[#A85C36] underline hover:text-[#784528]">Start here</button>
            </div>
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
