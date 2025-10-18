"use client";

import { db } from "../../lib/firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useState, useEffect, useRef } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../../lib/firebase";
import OnboardingVisual from "../../components/OnboardingVisual";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { useAuth } from '../../contexts/AuthContext';
import { useCustomToast } from '../../hooks/useCustomToast';
import { WandSparkles, X, User, Pencil, Upload, Info, Sparkles } from 'lucide-react';
import Link from "next/link";
import { addGmailScopes, getGmailCalendarScopeString } from '../../lib/gmailScopes';

import VenueCard from '@/components/VenueCard';
import PlacesAutocompleteInput from '@/components/PlacesAutocompleteInput';
import VenueSearchInput from '@/components/VenueSearchInput';
import GoogleMapsLoader from '@/components/GoogleMapsLoader';
import DreamDayConfirmation from '@/components/onboarding/DreamDayConfirmation';
import EmailVerificationRequired from '@/components/auth/EmailVerificationRequired';

// @ts-ignore
// eslint-disable-next-line
declare const google: any;

export default function SignUp() {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const [step, setStep] = useState(1);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [step2Errors, setStep2Errors] = useState<{ userName?: string; partnerName?: string }>({});
  const [userName, setUserName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [undecidedDate, setUndecidedDate] = useState(false);
  const [weddingDateError, setWeddingDateError] = useState("");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isNewSignup, setIsNewSignup] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [showPasswordPopover, setShowPasswordPopover] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [vibe, setVibe] = useState<string[]>([]);
  const [venueType, setVenueType] = useState<string>('');
  const [mustHaves, setMustHaves] = useState<string>('');
  const [inspirationImage, setInspirationImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pinterestLink, setPinterestLink] = useState<string>('');
  const [vibeInputMethod, setVibeInputMethod] = useState<'pills' | 'image' | 'pinterest'>('pills');
  const [weddingLocation, setWeddingLocation] = useState('');
  const [hasVenue, setHasVenue] = useState<boolean | null>(null);
  const [selectedVenueMetadata, setSelectedVenueMetadata] = useState<any | null>(null);
  const [weddingLocationUndecided, setWeddingLocationUndecided] = useState(false);
  const [selectedLocationType, setSelectedLocationType] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [vibeGenerated, setVibeGenerated] = useState(false);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [generatedVibes, setGeneratedVibes] = useState<string[]>([]);
  const [showCustomVibeInput, setShowCustomVibeInput] = useState(false);
  const [customVibe, setCustomVibe] = useState('');
  const [maxBudget, setMaxBudget] = useState(35000);
  const [guestCount, setGuestCount] = useState(120);
  const [saving, setSaving] = useState(false);
  const [venueSearchQuery, setVenueSearchQuery] = useState('');
  const [disableSignup, setDisableSignup] = useState(false);
  const [weddingLocationCoords, setWeddingLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  // No auto-correction needed for single max budget

  // Note: Removed automatic session cleanup from signup page
  // Session cleanup should only happen when explicitly needed (e.g., logout)
  // This prevents interference with the Google OAuth flow

  const vibeTabs = [
    { key: 'pills', label: 'Popular Vibes', icon: '✨' },
    // { key: 'image', label: 'Upload Image', icon: '🖼️' }, // Hidden for now
    { key: 'pinterest', label: 'Pinterest', icon: '📌', comingSoon: true },
  ];

  const vibeOptions = [
    'Intimate & cozy',
    'Big & bold',
    'Chic city affair',
    'Outdoor & natural',
    'Traditional & timeless',
    'Modern & minimal',
    'Destination dream',
    'Boho & Whimsical',
    'Glamorous & Luxe',
    'Vintage Romance',
    'Garden Party',
    'Beachy & Breezy',
    'Art Deco',
    'Festival-Inspired',
    'Cultural Fusion',
    'Eco-Friendly',
    'Fairytale',
    'Still figuring it out',
  ];

  

  const passwordRequirements = [
    { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
    { label: "One uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "One lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "One number", test: (pw: string) => /[0-9]/.test(pw) },
    { label: "One special character (!@#$%^&*)", test: (pw: string) => /[!@#$%^&*]/.test(pw) },
  ];
  const passwordChecks = passwordRequirements.map(req => req.test(password));

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

  // Redirect if already logged in, but only if not a new signup
  useEffect(() => {
    if (!authLoading && user && !isNewSignup) {
      // Only show toast if user is onboarded
      const checkOnboarded = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().onboarded === true) {
          showSuccessToast('You are already signed up and logged in!');
          // Optionally, you can disable the form or show a message instead of redirecting
        }
      };
      checkOnboarded();
    }
  }, [user, authLoading, router, isNewSignup]);

  // Optionally, you can disable the signup form if already logged in and onboarded
  useEffect(() => {
    if (!authLoading && user && !isNewSignup) {
      const checkOnboarded = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().onboarded === true) {
          setDisableSignup(true);
        }
      };
      checkOnboarded();
    }
  }, [user, authLoading, isNewSignup]);

  useEffect(() => {
    if (user && !authLoading) {
      const checkOnboarded = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setOnboarded(!!userSnap.data().onboarded);
        } else {
          setOnboarded(null);
        }
      };
      checkOnboarded();
    } else {
      setOnboarded(null);
    }
  }, [user, authLoading]);

  // Handle redirect for onboarded users
  useEffect(() => {
    if (!authLoading && user && onboarded === true) {
      window.location.href = '/';
    }
  }, [user, authLoading, onboarded]);

  // Handle moving to step 2 for non-onboarded users
  useEffect(() => {
    if (!authLoading && user && onboarded === false && step === 1) {
      setStep(2);
    }
  }, [user, authLoading, onboarded, step]);

  // Handle email verification success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true' && user) {
      // User has verified their email, show success and proceed
      showSuccessToast('Email verified successfully! You can now continue with your account setup.');
      setNeedsEmailVerification(false);
      setStep(2);
    }
  }, [user, showSuccessToast]);


  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!passwordRegex.test(password)) {
      setError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*).");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Check if email already exists before proceeding
    try {
      setLoading(true);
      const res = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.exists) {
        setError('This email is already registered. Please log in.');
        setLoading(false);
        return;
      }
    } catch (err) {
      setError('Error checking email. Please try again.');
      setLoading(false);
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        // Send email verification with proper redirect URL
        await sendEmailVerification(result.user, {
          url: `${window.location.origin}/signup?verified=true`,
          handleCodeInApp: true
        });
        
        // Get the ID token and set the session cookie
        const idToken = await result.user.getIdToken();

        const res = await fetch("/api/sessionLogin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        
        if (res.ok) {
          // Create user document with emailVerified: false and provider: 'email'
          await setDoc(doc(db, "users", result.user.uid), {
            email: result.user.email,
            emailVerified: false,
            provider: 'email',
            onboarded: false,
            createdAt: new Date(),
          }, { merge: true });

          // Show email verification required
          setNeedsEmailVerification(true);
        } else {
          console.error('Session login failed');
          showErrorToast("Session login failed");
        }
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError('This email is already registered. Please log in.');
        setLoading(false);
        return;
      }
      let message = "An unexpected error occurred. Please try again.";
      if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check Gmail auth status
  const checkGmailAuthStatus = async (userId: string) => {
    try {
      const response = await fetch('/api/check-gmail-auth-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      return data.needsReauth === false; // true if Gmail is already connected
    } catch (error) {
      console.error('Error checking Gmail auth status:', error);
      return false;
    }
  };

  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' }); // Always show account picker
    
    // Add Gmail scopes for automatic Gmail connection
    addGmailScopes(provider, true); // Include calendar scopes
    try {
      setGoogleLoading(true);
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      // POST the ID token to your session login API
      const res = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (res.ok) {
        // Get the session token from the response and set client-side cookie
        const sessionData = await res.json();
        console.log('✅ [SIGNUP] Session login successful:', sessionData);
        
        // Server-side session cookie is already set by the API
        
        // Check if user doc exists in Firestore
        const userDocRef = doc(db, "users", result.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          // Store Gmail tokens from the sign-up popup
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const accessToken = credential?.accessToken;
          
          // Store Gmail tokens in Firestore (matching API expected format)
          const gmailTokens = {
            accessToken: accessToken,
            refreshToken: null, // Firebase popup doesn't provide refresh token
            expiryDate: Date.now() + 24 * 3600 * 1000, // 24 hours from now
            email: result.user.email, // Store Gmail account email
            scope: getGmailCalendarScopeString()
          };
          
          await setDoc(doc(db, "users", result.user.uid), {
            email: result.user.email,
            emailVerified: true, // Google OAuth emails are pre-verified
            provider: 'google',
            onboarded: false,
            createdAt: new Date(),
            // Store Gmail tokens and connection status
            googleTokens: gmailTokens,
            gmailConnected: true,
          }, { merge: true });
          
          setIsNewSignup(true);
          setStep(2);
        } else {
          // User already exists, check if they're onboarded
          const userData = userDocSnap.data();
          
          if (userData.onboarded === true) {
            // User is onboarded, redirect to dashboard
            console.log('🔄 [SIGNUP] Redirecting to dashboard');
            window.location.href = "/dashboard";
          } else {
            // User exists but not onboarded, continue with signup flow
            setIsNewSignup(true);
            setStep(2);
          }
        }
      } else {
        showErrorToast("Account already exists. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/login?existing=1";
        }, 2000);
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        console.log('Email already in use, redirecting to login page');
        showErrorToast("Account already exists. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/login?existing=1";
        }, 2000);
        return;
      }
      let message = "Google sign-in failed. Please try again.";
      if (err.code === "auth/popup-closed-by-user") {
        message = "Sign-in popup was closed before completing the process.";
      } else if (err.code === "auth/account-exists-with-different-credential") {
        message = "An account already exists with this email. Redirecting to login...";
        showErrorToast(message);
        setTimeout(() => {
          window.location.href = "/login?existing=1";
        }, 2000);
        return;
      } else if (err.code === "auth/operation-not-allowed") {
        message = "Google sign-in is not enabled. Please try email signup.";
      } else if (err.code === "auth/unauthorized-domain") {
        message = "This domain is not authorized for Google sign-in.";
      }
      setError(message);
      showErrorToast(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const checkEmailExists = async (email: string) => {
    if (!email) return;
    const res = await fetch('/api/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setEmailExists(data.exists);
  };

  // Add a derived state for confirm password match
  const confirmPasswordMatches = confirmPassword === password || confirmPassword.length === 0;

  const handleLogout = async () => {
    await fetch('/api/sessionLogout', { method: 'POST', credentials: 'include' });
    await auth.signOut();
    window.location.href = '/signup';
  };

  if (!authLoading && user && onboarded === true) {
    return null;
  }

  if (!authLoading && user && onboarded === false && step === 1) {
    setStep(2);
  }

  // Helper for clamping values
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

  // Save onboarding data to Firestore
  const saveOnboardingData = async (stepData: any) => {
    setSaving(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user.");
        showErrorToast("Authentication error. Please try again.");
        return false;
      }

      // Deep clean the data to remove all undefined values
      const cleanData = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
          return obj.map(cleanData).filter(item => item !== null && item !== undefined);
        }
        
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
          const value = cleanData(obj[key]);
          if (value !== null && value !== undefined) {
            cleaned[key] = value;
          }
        });
        return cleaned;
      };

      if (stepData.selectedVenueMetadata) {
        const { name, formatted_address, geometry, place_id, photos, url, vicinity } = stepData.selectedVenueMetadata;
        
        // Ensure geometry and photos are handled safely
        let serializedGeometry: any = undefined;
        if (geometry && geometry.location) {
          const lat = typeof geometry.location.lat === 'function' ? geometry.location.lat() : geometry.location.lat;
          const lng = typeof geometry.location.lng === 'function' ? geometry.location.lng() : geometry.location.lng;
          
          if (typeof lat === 'number' && typeof lng === 'number') {
            serializedGeometry = {
              location: { lat, lng },
              viewport: geometry.viewport,
            };
          }
        }

        const serializedPhotos = photos ? photos.map(photo => ({
          height: photo.height,
          html_attributions: photo.html_attributions,
          photo_reference: photo.photo_reference,
          width: photo.width,
        })) : undefined;
        
        stepData.selectedVenueMetadata = {
          name,
          formatted_address,
          geometry: serializedGeometry,
          place_id,
          photos: serializedPhotos,
          url,
          vicinity
        };

        // Add venue to user's vendor management system (NOT as a messaging contact)
        try {
          const { addVendorToUserAndCommunity } = await import('../../lib/addVendorToUserAndCommunity');
          const result = await addVendorToUserAndCommunity({
            userId: user.uid,
            vendorMetadata: stepData.selectedVenueMetadata,
            category: "Venue",
            selectedAsVenue: true,
            selectedAsVendor: false
          });

          if (result.success) {
            console.log('Successfully added venue to user vendor management system');
            
            // Mark the venue as official (starred) in the user's vendor list
            try {
              const { doc, updateDoc } = await import('firebase/firestore');
              const vendorRef = doc(db, `users/${user.uid}/vendors`, result.vendorId!);
              await updateDoc(vendorRef, {
                isOfficial: true,
                category: "Venue"
              });
              console.log('Marked venue as official in user vendor management system');
            } catch (error) {
              console.error('Error marking venue as official:', error);
              // Don't fail the signup if this fails
            }
          } else {
            console.error('Failed to add venue to vendor management system:', result.error);
            // Don't fail the signup if this fails
          }
        } catch (error) {
          console.error('Error adding venue to vendor management system:', error);
          // Don't fail the signup if this fails
        }
      }

      const cleanedStepData = cleanData(stepData);
      console.log('Saving data to Firestore:', cleanedStepData);

      await setDoc(doc(db, "users", user.uid), {
        ...cleanedStepData,
        email: user.email,
        hasSeenWelcomeModal: false, // New users haven't seen welcome modal yet
        updatedAt: new Date(),
      }, { merge: true });
      
      console.log('Successfully saved onboarding data to Firestore');
      return true;
    } catch (error) {
      console.error("Error saving onboarding data:", error);
              showErrorToast("Failed to save your progress. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Enhanced onboarding is now handled in the dashboard after signup completion

  // Show email verification required if needed
  if (needsEmailVerification) {
    return (
      <EmailVerificationRequired 
        onVerified={() => {
          setNeedsEmailVerification(false);
          setStep(2);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F2F0] flex justify-center overflow-x-hidden">
      <GoogleMapsLoader />
      <div className="w-full max-w-[1280px] flex">
        <div className="w-full lg:w-[40%] lg:min-w-[400px] flex flex-col justify-center items-start px-8">
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
                <div className="flex flex-col justify-center items-center px-4 lg:px-12">
                    <Link href="/" className="flex items-center no-underline mb-8">
                      <img 
                        src="/PaigeFinal.png" 
                        alt="Paige" 
                        className="h-[32px] w-auto max-w-none"
                      />
                    </Link>
                    
                    {/* Mobile placeholder image */}
                    <div className="mb-6 lg:hidden flex justify-center">
                      <img 
                        src="/api/optimize-image?src=/cheerslog.png&f=webp&q=85&w=200"
                        alt="Wedding planning illustration"
                        className="w-24 h-auto opacity-90"
                      />
                    </div>
                    
                    <h1 className="text-[#332B42] text-2xl font-playfair font-semibold mb-4 text-center w-full">
            Welcome to Paige!
          </h1>
          <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-center w-full">
            Clarity and calm, for every step down the aisle.
          </h4>

                    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
              <div className="pt-2">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
                className={`w-full flex items-center justify-center gap-2 py-2 text-base font-normal rounded-[5px] ${googleLoading ? "bg-[#DCDCDC] cursor-not-allowed" : "btn-primaryinverse"}`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <img src="/Google__G__logo.svg" alt="Google" width="16" height="16" className="block" />
                </span>
                <span className={googleLoading ? "text-xs font-semibold font-work-sans" : ""}>
                  {googleLoading ? "Creating account..." : "Sign up with Google"}
                </span>
              </button>
              <div className="text-xs text-center text-[#7A7A7A] mt-3 flex items-center justify-center gap-1">
                <WandSparkles className="w-3 h-3" />
                Recommended for best Paige experience
                <div className="relative group">
                  <Info className="w-3 h-3 ml-1 cursor-pointer" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-[#332B42] text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-48">
                    <div className="text-center">
                      <div className="font-semibold mb-1">Google Sign-up Benefits:</div>
                    </div>
                    <div className="text-left">
                      <div>• Instant Gmail import</div>
                      <div>• Seamless email notifications</div>
                      <div>• Faster onboarding</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#332B42]"></div>
                  </div>
                </div>
              </div>
              </div>

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
                  Your Email<span className="text-[#A85C36]">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailExists(null); // reset on change
                  }}
                  onBlur={() => checkEmailExists(email)}
                  placeholder="Email address"
                  className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                  autoComplete="email"
                />
                {emailExists === true && (
                  <div className="text-red-600 text-xs mt-1">This email is already registered. Please log in.</div>
                )}
              </div>

              <div>
                <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
                  Your Password<span className="text-[#A85C36]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowPasswordPopover(true)}
                    onBlur={() => setTimeout(() => setShowPasswordPopover(false), 100)}
                    ref={passwordInputRef}
                    placeholder="Password"
                    className="w-full px-3 py-2 pr-10 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#7A7A7A] hover:text-[#332B42]"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  {showPasswordPopover && (
                    <div className="absolute left-0 top-12 z-10 w-64 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg p-3 text-xs text-[#332B42] animate-fade-in">
                      <div className="font-semibold mb-2">Password must contain:</div>
                      <ul className="space-y-1">
                        {passwordRequirements.map((req, idx) => (
                          <li key={req.label} className="flex items-center gap-2">
                            {passwordChecks[idx] ? (
                              <span className="text-green-600">✔</span>
                            ) : (
                              <span className="text-gray-400">✗</span>
                            )}
                            <span className={passwordChecks[idx] ? "text-green-700" : ""}>{req.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
                  Confirm Password<span className="text-[#A85C36]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className={`w-full px-3 py-2 pr-10 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]${!confirmPasswordMatches ? ' border-red-500' : ''}`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#7A7A7A] hover:text-[#332B42]"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {!confirmPasswordMatches && (
                  <div className="text-xs text-red-600 mt-1">Passwords do not match.</div>
                )}
              </div>

              {error && (
              <div className="text-xs text-[#A85C36] font-medium mt-[-4px]">
                {error}
              </div>
            )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 text-base font-normal rounded-[5px] ${loading ? "bg-[#DCDCDC] cursor-not-allowed" : "btn-primary"}`}
              >
                {loading ? "Creating account..." : "Sign Up"}
              </button>

            </form>

            <p className="text-xs text-center font-work-sans text-[#332B42] mt-8">
              Already have an account?{" "}
              <a href="/login" className="text-[#A85C36] cursor-pointer font-medium underline hover:text-[#784528]">Login</a>
            </p>

            {/* Temporarily hidden during beta testing */}
            {/* <div className="mt-1 text-xs text-[#364257]">
              Are you a wedding planner?{" "}
              <button className="text-[#A85C36] underline hover:text-[#784528]">Start here</button>
            </div> */}
            </div>
              </>
            )}
            {step === 2 && (
  <>
    <h1 className="text-[#332B42] text-2xl font-playfair font-semibold mb-4 text-left w-full">
      First things first...
    </h1>
    <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-left w-full">
      Tell us about your big day
    </h4>
    <form className="w-full max-w-md space-y-4">
      <div>
        <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
  Your Full Name<span className="text-[#A85C36]">*</span>
</label>
        <input
          type="text"
          placeholder="Full Name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
        />
        {step2Errors.userName && (
<p className="text-xs text-[#A85C36] mt-1">{step2Errors.userName}</p>
)}
      </div>
      <h2 className="text-2xl font-playfair font-semibold text-[#332B42] text-left">&</h2>
      <div>
       <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
  Your Partner's Full Name<span className="text-[#A85C36]">*</span>
</label>
        <input
          type="text"
          placeholder="Partner's Name"
          value={partnerName}
          onChange={(e) => setPartnerName(e.target.value)}
          className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
        />
          {step2Errors.partnerName && (
 <p className="text-xs text-[#A85C36] mt-1">{step2Errors.partnerName}</p>
)}
      </div>
      <div>
  <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
          When's the big day?<span className="text-[#A85C36]">*</span>
  </label>
  <div className="relative">
   <input
  type="date"
  id="weddingDate"
  value={weddingDate}
  onChange={(e) => setWeddingDate(e.target.value)}
  disabled={undecidedDate}
  min={new Date().toISOString().split("T")[0]}
  placeholder={undecidedDate ? "We're working on it!" : "Select a date"}
            className={`w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] text-sm text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] bg-white appearance-none ${undecidedDate ? "text-[#AB9C95] cursor-not-allowed" : ""}`}
/>
{weddingDateError && (
  <p className="text-[#A85C36] text-xs mt-1">{weddingDateError}</p>
)}
  </div>
  <label className="mt-2 flex items-center text-sm text-[#332B42] gap-2">
    <input
      type="checkbox"
      checked={undecidedDate}
            onChange={() => {
              if (!undecidedDate) {
                setWeddingDate("");
                setWeddingDateError("");
              }
              setUndecidedDate(!undecidedDate);
            }}
      className="form-checkbox rounded border-[#AB9C95] text-[#A85C36]"
    />
    We haven't decided yet
  </label>
</div>
     <div className="w-full mt-8">
       <div className="flex w-full gap-4">
     <button
  type="button"
           className="btn-primary w-full"
           disabled={
             !userName.trim() ||
             !partnerName.trim() ||
             (!undecidedDate && !weddingDate) ||
             saving
           }
 onClick={async () => {
  const errors: { userName?: string; partnerName?: string } = {};
             if (!userName.trim()) {
               errors.userName = "Your name is required";
               return;
             }
             if (!partnerName.trim()) {
               errors.partnerName = "Partner's name is required";
               return;
             }
             if (!undecidedDate) {
               if (weddingDate) {
  const selectedDate = new Date(weddingDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    setWeddingDateError("Please select a future date.");
    return;
  } else {
    setWeddingDateError("");
  }
               } else {
                 setWeddingDateError("");
}
             } else {
               setWeddingDateError("");
}
  if (Object.keys(errors).length > 0) {
    setStep2Errors(errors);
               return;
  } else {
    setStep2Errors({});
    try {
      const success = await saveOnboardingData({
          userName: userName.trim(),
          partnerName: partnerName.trim(),
          ...(weddingDate ? { weddingDate: Timestamp.fromDate(new Date(weddingDate)) } : {}),
          weddingDateUndecided: undecidedDate,
        onboarded: false,
          createdAt: new Date(),
        });
      
      if (success) {
        setStep(3);
      }
    } catch (error) {
      console.error("Error saving onboarding data:", error);
    }
  }
}}
>
           {saving ? "Saving..." : "Continue"}
</button>
       </div>
       <div className="flex justify-center items-center gap-2 mt-4">
         {[0, 1, 2, 3, 4].map((n) => (
           <span
             key={n}
             className={`h-2 w-2 rounded-full transition-all duration-200 ${step - 2 === n ? 'bg-[#A85C36]' : 'bg-[#E0D6D0]'}`}
           />
         ))}
       </div>
     </div>
    </form>
  </>
)}
{step === 3 && (
  <>
    <h1 className="text-[#332B42] text-2xl font-playfair font-semibold mb-4 text-left w-full">
      Let's bring your vision to life.
    </h1>
    <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-left w-full">
      We use your answers to make planning easy—so you can enjoy every moment.
    </h4>
    <form className="w-full max-w-md space-y-6">
      {/* Wedding Location Question */}
      <div>
        <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
          Where do you want to get married? <span className="text-[#A85C36]">*</span>
        </label>
        <div className="relative">
           <PlacesAutocompleteInput
              value={weddingLocation}
              onChange={(newValue) => {
                  setWeddingLocation(newValue);
                  if (!newValue) {
                      setSelectedVenueMetadata(null);
                      setHasVenue(null);
                      setWeddingLocationCoords(null);
                  }
              }}
              setVenueMetadata={(metadata) => {
                  setSelectedVenueMetadata(metadata);
                  if (metadata) {
                      setWeddingLocation(metadata.name);
                      setHasVenue(true);
                      // Store coordinates for venue search bias
                      if (metadata.geometry?.location) {
                          const coords = {
                              lat: typeof metadata.geometry.location.lat === 'function' ? metadata.geometry.location.lat() : metadata.geometry.location.lat,
                              lng: typeof metadata.geometry.location.lng === 'function' ? metadata.geometry.location.lng() : metadata.geometry.location.lng
                          };
                          console.log('Setting wedding location coordinates:', coords);
                          setWeddingLocationCoords(coords);
                      } else {
                          console.log('No geometry found in metadata:', metadata);
                      }
                  }
              }}
              setSelectedLocationType={setSelectedLocationType}
              placeholder="Search for a city"
              disabled={weddingLocationUndecided}
              types={['geocode']}
            />
        </div>
        <div className="mt-2 flex items-center text-sm text-[#332B42] gap-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={weddingLocationUndecided}
              onChange={() => {
                const isUndecided = !weddingLocationUndecided;
                setWeddingLocationUndecided(isUndecided);
                if (isUndecided) {
                  setWeddingLocation("");
                  setSelectedVenueMetadata(null);
                  setHasVenue(null);
                  setVenueSearchQuery('');
                }
              }}
              className="form-checkbox rounded border-[#AB9C95] text-[#A85C36]"
            />
            <span className="ml-2 select-none">We haven't decided yet</span>
          </label>
        </div>
      </div>

      {/* Only render the rest if not undecided and a location is entered */}
      {!weddingLocationUndecided && weddingLocation && (
        <>
            {/* Venue question */}
            <div>
              <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
                Have you already found your venue? <span className="text-[#A85C36]">*</span>
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="hasVenue"
                    checked={hasVenue === true}
                    onChange={() => {
                      setHasVenue(true);
                    }}
                    className="form-radio text-[#A85C36] focus:ring-[#A85C36]"
                  />
                  <span className="ml-2 text-sm text-[#332B42]">Yes</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="hasVenue"
                    checked={hasVenue === false}
                    onChange={() => {
                      setHasVenue(false);
                      // If they say no, clear venue data but keep location
                      setSelectedVenueMetadata(null);
                      setVenueSearchQuery("");
                    }}
                    className="form-radio text-[#A85C36] focus:ring-[#A85C36]"
                  />
                  <span className="ml-2 text-sm text-[#332B42]">No</span>
                </label>
              </div>
            </div>

            {/* Show venue search only if they say "Yes" */}
            {hasVenue === true && (
              <div>
                <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
                  Search for your venue <span className="text-[#A85C36]">*</span>
                </label>
                <VenueSearchInput
                  value={venueSearchQuery}
                  onChange={setVenueSearchQuery}
                  setVenueMetadata={(metadata) => {
                    setSelectedVenueMetadata(metadata);
                    setVenueSearchQuery(metadata?.name || '');
                  }}
                  placeholder="Search for your venue"
                  weddingLocation={weddingLocation}
                />

                {selectedVenueMetadata && (
                  <div className="mt-4">
                    <VenueCard
                      venue={selectedVenueMetadata}
                      showDeleteButton={true}
                      onDelete={() => {
                        setSelectedVenueMetadata(null);
                        setVenueSearchQuery('');
                        // Also clear the main location input if it was tied to this venue
                        if (weddingLocation === selectedVenueMetadata.name) {
                          setWeddingLocation('');
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
        </>
      )}

      <div className="w-full mt-8">
        <div className="flex w-full gap-4">
          <button
            type="button"
            className="btn-primaryinverse flex-1 py-2 rounded-[5px] font-semibold text-base"
            onClick={() => setStep(2)}
          >
            Back
          </button>
          <button
            type="button"
            className="btn-primary flex-1 py-2 rounded-[5px] font-semibold text-base"
            onClick={() => {
              const saveAndContinue = async () => {
                const step3Data: any = {
                  weddingLocation: weddingLocationUndecided ? null : (weddingLocation.trim() || null),
                  weddingLocationUndecided: weddingLocationUndecided || false,
                  hasVenue: hasVenue,
                  selectedVenueMetadata: selectedVenueMetadata || null,
                };
                
                const success = await saveOnboardingData(step3Data);
                if (success) {
                  setStep(4);
                }
              };

              if (weddingLocationUndecided) {
                 saveAndContinue();
                 return;
              }
              if (!weddingLocation.trim()) {
                showErrorToast("Please enter your wedding location");
                return;
              }
              if (hasVenue === null) {
                showErrorToast("Please let us know if you have a venue");
                return;
              }
              if (hasVenue && !selectedVenueMetadata) {
                showErrorToast("Please select your venue");
                return;
              }
              
              saveAndContinue();
            }}
            disabled={
              saving ||
              (!weddingLocationUndecided && (
                !weddingLocation.trim() ||
                hasVenue === null ||
                (hasVenue === true && !selectedVenueMetadata)
              ))
            }
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
        <div className="flex justify-center items-center gap-2 mt-4">
          {[0, 1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-2 w-2 rounded-full transition-all duration-200 ${step - 2 === n ? 'bg-[#A85C36]' : 'bg-[#E0D6D0]'}`}
            />
          ))}
        </div>
      </div>
    </form>
  </>
)}
{step === 4 && (
  <>
    <h1 className="text-[#332B42] text-2xl font-playfair font-semibold mb-4 text-left w-full">
      What kind of vibe are you going for?
    </h1>
    <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-left w-full">
      Select all that apply, upload inspiration, or link your Pinterest board.
    </h4>
    <form className="w-full max-w-md space-y-6">
      {/* Tabs for vibe input method */}
      <div className="flex mb-4 border-b border-[#E0D6D0] mt-2">
        {vibeTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 px-2 py-1 text-xs font-work-sans font-medium border-b-2 transition-colors duration-150 focus:outline-none whitespace-nowrap ${vibeInputMethod === tab.key ? 'border-[#A85C36] text-[#A85C36] bg-[#F8F5F2]' : 'border-transparent text-[#332B42] bg-transparent hover:bg-[#F3F2F0]'}`}
            onClick={() => setVibeInputMethod(tab.key as typeof vibeInputMethod)}
            style={{ borderRadius: '8px 8px 0 0' }}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.comingSoon && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded-full font-medium">
                Coming soon
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Conditionally render the selected input, with fixed min-height to prevent jumping */}
      <div className="min-h-[80px] flex items-center">
        {vibeInputMethod === 'pills' && (
          <div className="flex flex-col w-full">
            <span className="text-xs text-[#332B42] mb-2">Select all that apply.</span>
            <div className="flex flex-wrap gap-2 mb-2">
              {vibeOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`px-3 py-1 rounded-full border text-sm font-work-sans transition-colors duration-150 ${vibe.includes(option) ? 'bg-[#A85C36] text-white border-[#A85C36]' : 'bg-white text-[#332B42] border-[#AB9C95]'}`}
                  onClick={() => {
                    setVibe((prev) =>
                      prev.includes(option)
                        ? prev.filter((v) => v !== option)
                        : [...prev, option]
                    );
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
            {/* Custom vibe pills */}
            <div className="flex flex-wrap gap-2 mb-2">
              {vibe.filter(v => !vibeOptions.includes(v)).map((custom, idx) => (
                <span
                  key={custom + idx}
                  className="px-3 py-1 rounded-full border text-sm font-work-sans bg-white text-[#332B42] border-[#A85C36] flex items-center gap-1"
                  style={{ textTransform: 'capitalize' }}
                >
                  {custom}
                  <button
                    type="button"
                    className="ml-1 text-[#A85C36] hover:text-[#784528]"
                    onClick={() => setVibe(vibe.filter((v, i) => i !== vibe.findIndex(val => val === custom && i === idx)))}
                    aria-label={`Remove ${custom}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {/* +Add button and custom input */}
              {showCustomVibeInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customVibe}
                    onChange={e => setCustomVibe(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customVibe.trim()) {
                          setVibe([...vibe, customVibe.trim()]);
                          setCustomVibe('');
                          setShowCustomVibeInput(false);
                        }
                      }
                    }}
                    className="px-2 py-1 border rounded-full text-sm font-work-sans border-[#A85C36] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                    placeholder="Add custom vibe"
                    style={{ textTransform: 'capitalize', minWidth: 100 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="text-[#A85C36] font-semibold text-base"
                    onClick={() => {
                      if (customVibe.trim()) {
                        setVibe([...vibe, customVibe.trim()]);
                        setCustomVibe('');
                        setShowCustomVibeInput(false);
                      }
                    }}
                  >
                    Add
                  </button>
                  <button type="button" className="ml-1 text-[#A85C36] text-lg" onClick={() => setShowCustomVibeInput(false)} aria-label="Cancel">×</button>
                </div>
              ) :
                <button
                  type="button"
                  className="px-3 py-1 rounded-full border text-sm font-work-sans bg-white text-[#A85C36] border-[#A85C36] flex items-center gap-1"
                  style={{ textTransform: 'capitalize' }}
                  onClick={() => setShowCustomVibeInput(true)}
                >
                  +Add
                </button>
              }
            </div>
          </div>
        )}
        {/* Upload Image tab - Hidden for now */}
        {false && vibeInputMethod === 'image' && (
          <div className="w-full flex flex-col">
            <label className="block text-xs font-medium text-[#332B42] mb-1">Upload Inspiration Image</label>
            {/* If vibeGenerated, show preview, remove button, and pills */}
            {vibeGenerated && inspirationImage && (
              <>
                <div className="flex flex-col items-center">
                  <img src={imagePreview!} alt="Inspiration preview" className="mt-2 rounded-lg max-h-32 border border-[#AB9C95] mx-auto" />
                  <button
                    type="button"
                    className="text-xs text-[#A85C36] underline mt-2 mb-4"
                    onClick={() => {
                      setInspirationImage(null);
                      setImagePreview(null);
                      setVibeGenerated(false);
                      setGeneratedVibes([]);
                    }}
                  >
                    Remove image
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {generatedVibes.map((vibe, idx) => (
                    <span
                      key={vibe}
                      className="px-3 py-1 rounded-full border text-sm font-work-sans bg-white text-[#332B42] border-[#A85C36] flex items-center gap-1"
                      style={{ textTransform: 'capitalize' }}
                    >
                      {vibe}
                      <button
                        type="button"
                        className="ml-1 text-[#A85C36] hover:text-[#784528]"
                        onClick={() => setGeneratedVibes(generatedVibes.filter((_, i) => i !== idx))}
                        aria-label={`Remove ${vibe}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {/* +Add button and custom input */}
                  {showCustomVibeInput ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customVibe}
                        onChange={e => setCustomVibe(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customVibe.trim()) {
                              setGeneratedVibes([...generatedVibes, customVibe.trim()]);
                              setCustomVibe('');
                              setShowCustomVibeInput(false);
                            }
                          }
                        }}
                        className="px-2 py-1 border rounded-full text-sm font-work-sans border-[#A85C36] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                        placeholder="Add custom vibe"
                        style={{ textTransform: 'capitalize', minWidth: 100 }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="text-[#A85C36] font-semibold text-base"
                        onClick={() => {
                          if (customVibe.trim()) {
                            setGeneratedVibes([...generatedVibes, customVibe.trim()]);
                            setCustomVibe('');
                            setShowCustomVibeInput(false);
                          }
                        }}
                      >
                        Add
                      </button>
                      <button type="button" className="ml-1 text-[#A85C36] text-lg" onClick={() => setShowCustomVibeInput(false)} aria-label="Cancel">×</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="px-3 py-1 rounded-full border text-sm font-work-sans bg-white text-[#A85C36] border-[#A85C36] flex items-center gap-1"
                      style={{ textTransform: 'capitalize' }}
                      onClick={() => setShowCustomVibeInput(true)}
                    >
                      +Add
                    </button>
                  )}
                </div>
              </>
            )}
            {/* If not generated, show upload area and button */}
            {!vibeGenerated && (
              <div
                className={`w-full border border-[#AB9C95] px-3 py-6 rounded-[5px] text-sm flex flex-col items-center justify-center transition-colors duration-150 ${dragActive ? 'bg-[#F3F2F0] border-[#A85C36]' : 'bg-white'}`}
                onDragOver={e => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={e => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDrop={e => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files && e.dataTransfer.files[0];
                  if (file) {
                    if (!file.type.startsWith('image/')) {
                      showErrorToast('Please upload a valid image file.');
                      setInspirationImage(null);
                      setImagePreview(null);
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      showErrorToast('Image must be less than 5MB.');
                      setInspirationImage(null);
                      setImagePreview(null);
                      return;
                    }
                    setInspirationImage(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
              >
                <div className="w-full flex flex-col items-center">
                  {!inspirationImage && (
                    <div className="text-xs text-[#AB9C95] mb-2 text-center">No file chosen</div>
                  )}
                  {inspirationImage && (
                    <div className="text-sm text-[#332B42] mb-2 text-center">Selected file: {inspirationImage.name}</div>
                  )}
                  <label className="btn-primaryinverse block mx-auto mt-0 mb-2 text-center cursor-pointer" htmlFor="vibe-image-upload">
                    Choose File
                    <input
                      id="vibe-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files && e.target.files[0];
                        if (file) {
                          if (!file.type.startsWith('image/')) {
                            showErrorToast('Please upload a valid image file.');
                            setInspirationImage(null);
                            setImagePreview(null);
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            showErrorToast('Image must be less than 5MB.');
                            setInspirationImage(null);
                            setImagePreview(null);
                            return;
                          }
                          setInspirationImage(file);
                          setImagePreview(URL.createObjectURL(file));
                        } else {
                          setInspirationImage(null);
                          setImagePreview(null);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center w-full">Drag & drop an image here, or click to select. Accepted formats: JPG, PNG, GIF, SVG, WebP. Max size: 5MB.</div>
                {imagePreview && (
                  <img src={imagePreview} alt="Inspiration preview" className="mt-2 rounded-lg max-h-32 border border-[#AB9C95] mx-auto" />
                )}
                {inspirationImage && (
                  <button
                    type="button"
                    className="btn-secondary flex items-center gap-2 mt-4"
                    onClick={async () => {
                      setVibeLoading(true);
                      setVibeGenerated(false);
                      setGeneratedVibes([]);
                      try {
                        const formData = new FormData();
                        formData.append('image', inspirationImage);
                        const res = await fetch('/api/generate-vibes-from-image', {
                          method: 'POST',
                          body: formData,
                        });
                        const data = await res.json();
                        if (data.vibes && Array.isArray(data.vibes)) {
                          setGeneratedVibes(data.vibes);
                          setVibeGenerated(true);
                        } else {
                          showErrorToast('Could not generate moods from image.');
                        }
                      } catch (err) {
                        showErrorToast('Failed to generate moods.');
                      } finally {
                        setVibeLoading(false);
                      }
                    }}
                    style={{ textTransform: 'none' }}
                    disabled={vibeLoading}
                  >
                    <WandSparkles className="w-4 h-4 mr-2" />
                    {vibeLoading ? 'Generating...' : 'Generate mood (2 Credits)'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {vibeInputMethod === 'pinterest' && (
          <div className="w-full">
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-md text-sm text-blue-800">
              <p className="font-semibold mb-1">Pinterest Integration Coming Soon!</p>
              <p>We're working on integrating Pinterest to automatically extract vibes from your boards. For now, you can use the "Popular Vibes" or "Upload Image" tabs to define your wedding style.</p>
            </div>
          </div>
        )}
      </div>
      <div className="w-full mt-8">
        <div className="flex w-full gap-4">
          <button
            type="button"
            className="btn-primaryinverse flex-1 py-2 rounded-[5px] font-semibold text-base"
            onClick={() => setStep(3)}
          >
            Back
          </button>
          <button
            type="button"
            className="btn-primary flex-1 py-2 rounded-[5px] font-semibold text-base"
            onClick={() => {
              if (vibe.length === 0 && !inspirationImage && !pinterestLink) {
                showErrorToast("Please select at least one vibe, upload an image, or provide a Pinterest link");
                return;
              }
              
              // Save step 4 data before advancing
              const saveAndContinue = async () => {
                const step4Data = {
                  vibe: vibe,
                  vibeInputMethod,
                  inspirationImage: inspirationImage ? {
                    name: inspirationImage.name,
                    size: inspirationImage.size,
                    type: inspirationImage.type,
                    // Note: We don't save the actual file, just metadata
                  } : null,
                  pinterestLink: pinterestLink || null,
                  vibeGenerated,
                  generatedVibes: generatedVibes || [],
                };
                
                const success = await saveOnboardingData(step4Data);
                if (success) {
                  setStep(5);
                }
              };
              
              saveAndContinue();
            }}
            disabled={
              (vibeInputMethod === 'pills' && vibe.length === 0) ||
              (vibeInputMethod === 'image' && (!inspirationImage || !vibeGenerated || generatedVibes.length === 0)) ||
              saving
            }
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
        <div className="flex justify-center items-center gap-2 mt-4">
          {[0, 1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-2 w-2 rounded-full transition-all duration-200 ${step - 2 === n ? 'bg-[#A85C36]' : 'bg-[#E0D6D0]'}`}
            />
          ))}
        </div>
      </div>
    </form>
  </>
)}
{step === 5 && (
  <>
    <h1 className="text-[#332B42] text-2xl font-playfair font-semibold mb-4 text-left w-full">
      What's your maximum wedding budget and how many guests are you expecting?
    </h1>
    <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-left w-full">
      Enter your maximum wedding budget and expected guest count below.
    </h4>
    <form className="w-full max-w-md space-y-8">
      <div>
        <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
          Maximum Budget<span className="text-[#A85C36]">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#332B42] text-sm">$</span>
          <input
            type="number"
            value={maxBudget}
            onChange={(e) => setMaxBudget(Number(e.target.value) || 0)}
            className="w-full pl-8 pr-4 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
            placeholder="Enter your maximum budget"
            min={1000}
            step={1000}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
          Guest Count<span className="text-[#A85C36]">*</span>
        </label>
        <input
          type="number"
          value={guestCount}
          onChange={(e) => setGuestCount(Number(e.target.value) || 0)}
          className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
          placeholder="Enter expected guest count"
          min={1}
          step={1}
        />
      </div>
      <div className="w-full mt-8">
        <div className="flex w-full gap-4">
          <button
            type="button"
            className="btn-primaryinverse flex-1 py-2 rounded-[5px] font-semibold text-base"
            onClick={() => setStep(4)}
          >
            Back
          </button>
          <button
            type="button"
            className="btn-primary flex-1 py-2 rounded-[5px] font-semibold text-base"
            onClick={async () => {
              // Save step 5 data and proceed to enhanced onboarding
              const saveAndProceed = async () => {
                const step5Data = {
                  maxBudget: maxBudget,
                  guestCount: guestCount,
                  onboarded: false, // Don't mark as onboarded yet
                };
                  
                  console.log('Saving step 5 data:', step5Data);
                  const success = await saveOnboardingData(step5Data);
                  if (success) {
                    console.log('Step 5 data saved, proceeding to step 6...');
                    setStep(6);
                  } else {
                    console.error('Failed to save step 5 data');
                    showErrorToast('Failed to save your data. Please try again.');
                  }
                };
                
                saveAndProceed();
              }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
        <div className="flex justify-center items-center gap-2 mt-4">
          {[0, 1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-2 w-2 rounded-full transition-all duration-200 ${step - 2 === n ? 'bg-[#A85C36]' : 'bg-[#E0D6D0]'}`}
            />
          ))}
        </div>
      </div>
    </form>
  </>
)}
{step === 6 && (
  <>
    <h1 className="text-[#332B42] text-2xl font-playfair font-semibold mb-4 text-left w-full">
      Confirm your Dream Day Details
    </h1>
    <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-left w-full">
      Here's what we know about your special day.
    </h4>
    <form className="w-full max-w-md space-y-8">
             <DreamDayConfirmation
               userName={userName}
               partnerName={partnerName}
               weddingDate={weddingDate}
               weddingLocation={weddingLocation}
               selectedVenueMetadata={selectedVenueMetadata}
               maxBudget={maxBudget}
               guestCount={guestCount}
               vibe={vibe}
               additionalContext={additionalContext}
               setAdditionalContext={setAdditionalContext}
             />
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setStep(5)}
          className="btn-primaryinverse flex-1 py-2 rounded-[5px] font-semibold text-base"
        >
          Back
        </button>
               <button
                 type="button"
                 onClick={async () => {
                   // Save the additional context to localStorage for the AI generation modal
                   if (additionalContext) {
                     localStorage.setItem('paige_ai_generation_context', additionalContext);
                     console.log('Set AI generation context:', additionalContext);
                   } else {
                     localStorage.setItem('paige_ai_generation_context', 'no-context');
                     console.log('Set AI generation context: no-context');
                   }
                   // Mark user as onboarded to prevent redirect back to signup
                   localStorage.setItem('paige_onboarding_status', 'onboarded');
                   console.log('Set onboarding status to onboarded');
                   
                   // Also update Firestore to mark user as onboarded and save additional context
                   try {
                     await updateDoc(doc(db, 'users', user.uid), {
                       onboarded: true,
                       additionalContext: additionalContext || null
                     });
                     console.log('Updated Firestore: user marked as onboarded and additional context saved');
                   } catch (error) {
                     console.error('Error updating onboarded status and additional context in Firestore:', error);
                   }
                   // Redirect to dashboard
                   router.push('/dashboard');
                 }}
                 className="btn-primary flex-1 py-2 rounded-[5px] font-semibold text-base flex items-center justify-center gap-2"
               >
                 <Sparkles className="w-4 h-4" />
                 Create my plan
               </button>
      </div>
    </form>
    <div className="flex justify-center items-center gap-2 mt-4">
      {[0, 1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={`h-2 w-2 rounded-full transition-all duration-200 ${step - 2 === n ? 'bg-[#A85C36]' : 'bg-[#E0D6D0]'}`}
        />
      ))}
    </div>
  </>
)}


            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hidden lg:flex w-[60%] p-4 m-4 items-center justify-center">
          <div className="flex-1 h-full bg-white shadow-md rounded-tl-[30px] rounded-br-[30px] p-4 flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.img
                  key="glasses"
                  src="/api/optimize-image?src=/glasses.png&f=webp&q=85&w=320"
                  alt="Onboarding visual"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  loading="eager"
                />
              )}
              {step === 2 && (
                <motion.img
                  key="heart"
                  src="/api/optimize-image?src=/heart.png&f=webp&q=85&w=320"
                  alt="Wedding heart illustration"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  loading="eager"
                />
              )}
              {step === 3 && (
                <motion.img
                  key="weather"
                  src="/api/optimize-image?src=/weather.png&f=webp&q=85&w=320"
                  alt="Wedding style illustration"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  loading="eager"
                />
              )}
              {step === 4 && (
                <motion.img
                  key="vibe"
                  src="/api/optimize-image?src=/vibe.png&f=webp&q=85&w=320"
                  alt="Vibe inspiration illustration"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  loading="eager"
                />
              )}
              {step === 5 && (
                <motion.img
                  key="budget"
                  src="/api/optimize-image?src=/budget.png&f=webp&q=85&w=320"
                  alt="Budget illustration"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  loading="eager"
                />
              )}
              {step === 6 && (
                <motion.img
                  key="confirmation"
                  src="/api/optimize-image?src=/heart.png&f=webp&q=85&w=320"
                  alt="Confirmation illustration"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  loading="eager"
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
} 