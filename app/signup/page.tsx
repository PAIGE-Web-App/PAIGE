"use client";

import { db } from "../../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useState, useEffect, useRef } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import OnboardingVisual from "../../components/OnboardingVisual";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { WandSparkles, X, User, Pencil, Upload } from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import VenueCard from '@/components/VenueCard';

// @ts-ignore
// eslint-disable-next-line
declare const google: any;

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
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
  const [venueSearch, setVenueSearch] = useState('');
  const [venueSuggestions, setVenueSuggestions] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [venueMetadata, setVenueMetadata] = useState<any | null>(null);
  const [weddingLocationUndecided, setWeddingLocationUndecided] = useState(false);
  const [selectedLocationType, setSelectedLocationType] = useState<string | null>(null);
  const [selectedVenueMetadata, setSelectedVenueMetadata] = useState<any | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [vibeGenerated, setVibeGenerated] = useState(false);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [generatedVibes, setGeneratedVibes] = useState<string[]>([]);
  const [showCustomVibeInput, setShowCustomVibeInput] = useState(false);
  const [customVibe, setCustomVibe] = useState('');
  const [budgetRange, setBudgetRange] = useState([10000, 30000]);
  const STEP = 1000;
  const minAllowed = 0;
  const maxAllowed = 150000;
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-correct invalid state
  useEffect(() => {
    if (budgetRange[1] - budgetRange[0] < STEP) {
      setBudgetRange([budgetRange[0], budgetRange[0] + STEP]);
    }
  }, [budgetRange]);

  // Clear any existing session when signup page loads
  useEffect(() => {
    // Clear any existing session cookie to ensure clean signup state
    document.cookie = '__session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }, []);

  const vibeTabs = [
    { key: 'pills', label: 'Popular Vibes', icon: '✨' },
    { key: 'image', label: 'Upload Image', icon: '🖼️' },
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

  console.log('Current step:', step);

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
      toast.error('Please login to access this page');
      } else if (toastValue === 'Log out successful!') {
        toast.success('Log out successful!');
      }
      document.cookie = 'show-toast=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }, []);

  // Redirect if already logged in, but only if not a new signup
  useEffect(() => {
    console.log('Signup page - auth state:', { user: !!user, authLoading, onboarded, isNewSignup });
    if (!authLoading && user && !isNewSignup) {
      // Only redirect if user is onboarded
      const checkOnboarded = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().onboarded === true) {
          console.log('Redirecting onboarded user to dashboard');
          router.push('/');
        }
      };
      checkOnboarded();
    }
  }, [user, authLoading, router, isNewSignup]);

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
    console.log('Signup page - auth state:', { user: !!user, authLoading, onboarded, isNewSignup });
    if (!authLoading && user && onboarded === true) {
      console.log('Redirecting onboarded user to dashboard');
      router.push('/');
    }
  }, [user, authLoading, onboarded, router]);

  // Handle moving to step 2 for non-onboarded users
  useEffect(() => {
    console.log('Signup page - checking step transition:', { user: !!user, authLoading, onboarded, step });
    if (!authLoading && user && onboarded === false && step === 1) {
      console.log('Moving to step 2 for non-onboarded user');
      setStep(2);
    }
  }, [user, authLoading, onboarded, step]);

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
      console.log('Creating user account...');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        console.log('User account created, setting up session...');
        // Get the ID token and set the session cookie
        const idToken = await result.user.getIdToken();
        console.log('Got ID token, calling sessionLogin...');
        const res = await fetch("/api/sessionLogin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        
        console.log('SessionLogin response:', res.ok);
        if (res.ok) {
          console.log('Session login successful, creating user document...');
          await setDoc(doc(db, "users", result.user.uid), {
            email: result.user.email,
            onboarded: false,
            createdAt: new Date(),
          }, { merge: true });
          console.log('User document created, setting new signup flag...');
          setIsNewSignup(true);
          setStep(2);
        } else {
          console.error('Session login failed');
          toast.error("Session login failed");
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

  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' }); // Always show account picker
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      // POST the ID token to your session login API
      const res = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (res.ok) {
        // Check if user doc exists in Firestore
        const userDocRef = doc(db, "users", result.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          await setDoc(doc(db, "users", result.user.uid), {
            email: result.user.email,
            onboarded: false,
            createdAt: new Date(),
          }, { merge: true });
          setIsNewSignup(true);
          setStep(2);
        } else {
          router.push("/");
        }
      } else {
        toast.error("Session login failed");
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
          router.push("/login?existing=1");
        return;
      }
      let message = "Google sign-in failed. Please try again.";
      if (err.code === "auth/popup-closed-by-user") {
        message = "Sign-in popup was closed before completing the process.";
      }
      setError(message);
    } finally {
      setLoading(false);
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

  // Add venue search functionality
  const searchVenues = async (query: string) => {
    if (!query.trim()) {
      setVenueSuggestions([]);
      return;
    }

    try {
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      const request = {
        query: query + ' wedding venue',
        type: 'establishment',
        fields: ['name', 'place_id', 'formatted_address', 'geometry'],
      };

      service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setVenueSuggestions(results);
        } else {
          setVenueSuggestions([]);
        }
      });
    } catch (error) {
      console.error('Error searching venues:', error);
      setVenueSuggestions([]);
    }
  };

  if (!authLoading && user && onboarded === true) {
    return null;
  }

  if (!authLoading && user && onboarded === false && step === 1) {
    setStep(2);
  }

  // Helper for clamping values
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

  // Serialize venue data for Firestore
  const serializeVenueData = (venue: any) => {
    if (!venue) return null;
    
    const serialized = {
      place_id: venue.place_id || null,
      name: venue.name || null,
      formatted_address: venue.formatted_address || null,
      geometry: venue.geometry ? {
        location: venue.geometry.location ? {
          lat: venue.geometry.location.lat(),
          lng: venue.geometry.location.lng()
        } : null
      } : null,
      types: venue.types || [],
      url: venue.url || null,
      rating: venue.rating || null,
      user_ratings_total: venue.user_ratings_total || null,
      photos: venue.photos ? venue.photos.map((photo: any) => ({
        photo_reference: photo.photo_reference,
        height: photo.height,
        width: photo.width
      })) : null
    };

    // Remove any undefined values
    Object.keys(serialized).forEach(key => {
      if (serialized[key] === undefined) {
        delete serialized[key];
      }
    });

    return serialized;
  };

  // Save onboarding data to Firestore
  const saveOnboardingData = async (stepData: any) => {
    setSaving(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user.");
        toast.error("Authentication error. Please try again.");
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

      const cleanedStepData = cleanData(stepData);
      console.log('Saving data to Firestore:', cleanedStepData);

      await setDoc(doc(db, "users", user.uid), {
        ...cleanedStepData,
        email: user.email,
        updatedAt: new Date(),
      }, { merge: true });
      
      console.log('Successfully saved onboarding data to Firestore');
      return true;
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      toast.error("Failed to save your progress. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F2F0] flex justify-center">
      <div className="w-full max-w-[1280px] flex">
        <div className="w-[40%] min-w-[400px] flex flex-col justify-center items-start px-12">
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
            Welcome to Paige!
          </h1>
          <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-center w-full">
            Clarity and calm, for every step down the aisle.
          </h4>

                    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
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
                    className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                    autoComplete="new-password"
                  />
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
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                  className={`w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]${!confirmPasswordMatches ? ' border-red-500' : ''}`}
                    autoComplete="new-password"
                  />
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

              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="btn-primaryinverse w-full flex items-center justify-center gap-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <img src="/Google__G__logo.svg" alt="Google" width="16" height="16" className="block" />
                </span>
                Sign up with Gmail
              </button>

            </form>

            <p className="text-xs text-center font-work-sans text-[#332B42] mt-8">
              Already have an account?{" "}
              <a href="/login" className="text-[#A85C36] cursor-pointer font-medium underline hover:text-[#784528]">Login</a>
            </p>

            <div className="mt-1 text-xs text-[#364257]">
              Are you a wedding planner?{" "}
              <button className="text-[#A85C36] underline hover:text-[#784528]">Start here</button>
            </div>
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
  Your Partner's Name<span className="text-[#A85C36]">*</span>
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
          weddingDate: weddingDate ? Timestamp.fromDate(new Date(weddingDate)) : null,
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
         {[0, 1, 2, 3].map((n) => (
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
            value={weddingLocationUndecided ? "We're working on location still!" : weddingLocation}
            onChange={setWeddingLocation}
            setVenueMetadata={setVenueMetadata}
            setSelectedLocationType={setSelectedLocationType}
            placeholder="Search for a city, state, or country"
            types={['(regions)']}
            disabled={weddingLocationUndecided}
          />
        </div>
        <div className="mt-2 flex items-center text-sm text-[#332B42] gap-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={weddingLocationUndecided}
              onChange={() => {
                setWeddingLocationUndecided(!weddingLocationUndecided);
                if (!weddingLocationUndecided) {
                  setVenueMetadata(null);
                  setHasVenue(null);
                  setVenueSearch("");
                  setVibe([]);
                }
              }}
              className="form-checkbox rounded border-[#AB9C95] text-[#A85C36]"
            />
            <span className="ml-2 select-none">We haven't decided yet</span>
          </label>
        </div>
      </div>

      {/* Only render the rest if not undecided */}
      {!weddingLocationUndecided && (
        <>
          {/* Show card at the top ONLY if venueMetadata is set (from main location input) */}
          {venueMetadata && (
            <div className="border rounded-lg p-4 bg-white shadow mt-4 flex flex-col md:flex-row gap-4 items-start">
              {/* Photo */}
              {venueMetadata.photos && venueMetadata.photos.length > 0 && (
                <img
                  src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${venueMetadata.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                  alt={venueMetadata.name}
                  className="rounded-lg object-cover w-[64px] h-[48px] mb-2 md:mb-0"
                  onError={(e) => { e.currentTarget.src = '/Venue.png'; }}
                />
              )}
              <div className="flex-1">
                <h5 className="font-playfair text-lg font-semibold mb-1">{venueMetadata.name}</h5>
                <div className="mb-1 text-xs text-[#364257]">{venueMetadata.formatted_address}</div>
                {/* Rating and reviews */}
                {venueMetadata.rating && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold">{venueMetadata.rating}</span>
                    {venueMetadata.user_ratings_total && (
                      <span className="text-xs text-[#364257]">({venueMetadata.user_ratings_total} Google reviews)</span>
                    )}
                  </div>
                )}
                {/* Google Maps link */}
                {venueMetadata.url && (
                  <a
                    href={venueMetadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline hover:text-blue-800"
                  >
                    View on Google Maps
                  </a>
                )}
              </div>
            </div>
          )}
          {/* If not a specific venue/address, show the rest of the flow */}
          {!venueMetadata && (
            <>
              {weddingLocation && !weddingLocationUndecided && ['locality', 'administrative_area_level_1', 'country'].includes(selectedLocationType || '') && (
                <>
                  {/* Venue question and rest of flow as before */}
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
                          onChange={() => setHasVenue(true)}
                          className="form-radio text-[#A85C36] focus:ring-[#A85C36]"
                        />
                        <span className="ml-2 text-sm text-[#332B42]">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="hasVenue"
                          checked={hasVenue === false}
                          onChange={() => setHasVenue(false)}
                          className="form-radio text-[#A85C36] focus:ring-[#A85C36]"
                        />
                        <span className="ml-2 text-sm text-[#332B42]">No</span>
                      </label>
                    </div>
                  </div>
                  {hasVenue === true && (
                    <div>
                      <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
                        Search for your venue <span className="text-[#A85C36]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={venueSearch}
                          onChange={(e) => {
                            setVenueSearch(e.target.value);
                            searchVenues(e.target.value);
                            setSelectedVenueMetadata(null); // Reset on change
                          }}
                          placeholder="Enter venue name"
                          className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                        />
                        {venueSuggestions.length > 0 && (
                          <ul className="absolute z-10 bg-white border border-[#AB9C95] rounded mt-1 w-full max-h-48 overflow-y-auto shadow-lg">
                            {venueSuggestions.map((venue) => (
                              <li
                                key={venue.place_id}
                                className="px-3 py-2 cursor-pointer hover:bg-[#F3F2F0] text-sm"
                                onClick={() => {
                                  setSelectedVenue(venue);
                                  setVenueSearch(venue.name);
                                  setVenueSuggestions([]);
                                  // Fetch and set venue metadata
                                  const placesService = new google.maps.places.PlacesService(document.createElement('div'));
                                  placesService.getDetails({ placeId: venue.place_id, fields: ['name', 'formatted_address', 'geometry', 'place_id', 'photos', 'rating', 'user_ratings_total', 'types', 'url'] }, (place, status) => {
                                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                                      setSelectedVenueMetadata(place);
                                    } else {
                                      setSelectedVenueMetadata(null);
                                    }
                                  });
                                }}
                              >
                                <div className="font-medium">{venue.name}</div>
                                <div className="text-xs text-gray-500">{venue.formatted_address}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {selectedVenueMetadata && (
                        <div className="mt-4">
                          <VenueCard
                            venue={selectedVenueMetadata}
                            showDeleteButton={false}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
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
              if (weddingLocationUndecided) {
                setStep(4);
                return;
              }
              if (!weddingLocation.trim()) {
                toast.error("Please enter your wedding location");
                return;
              }
              if (hasVenue === null) {
                toast.error("Please let us know if you have a venue");
                return;
              }
              if (hasVenue && !selectedVenue) {
                toast.error("Please select your venue");
                return;
              }
              
              // Save step 3 data before advancing
              const saveAndContinue = async () => {
                const step3Data: any = {
                  weddingLocation: weddingLocation.trim() || null,
                  weddingLocationUndecided: weddingLocationUndecided || false,
                  hasVenue: hasVenue !== null ? hasVenue : null,
                };
                
                // Only add venue data if it exists and is valid
                if (selectedVenue && selectedVenue.place_id) {
                  step3Data.selectedVenue = {
                    place_id: selectedVenue.place_id,
                    name: selectedVenue.name || null,
                    formatted_address: selectedVenue.formatted_address || null,
                  };
                }
                
                if (selectedVenueMetadata && selectedVenueMetadata.place_id) {
                  step3Data.selectedVenueMetadata = {
                    place_id: selectedVenueMetadata.place_id,
                    name: selectedVenueMetadata.name || null,
                    formatted_address: selectedVenueMetadata.formatted_address || null,
                    rating: selectedVenueMetadata.rating || null,
                    user_ratings_total: selectedVenueMetadata.user_ratings_total || null,
                    url: selectedVenueMetadata.url || null,
                  };
                }
                
                const success = await saveOnboardingData(step3Data);
                if (success) {
                  setStep(4);
                }
              };
              
              saveAndContinue();
            }}
            disabled={
              !weddingLocationUndecided &&
              (!weddingLocation.trim() || (hasVenue === true && !selectedVenue) || hasVenue === null) ||
              saving
            }
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
        <div className="flex justify-center items-center gap-2 mt-4">
          {[0, 1, 2, 3].map((n) => (
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
            className={`flex items-center gap-2 px-2 py-1 text-xs font-work-sans font-medium border-b-2 transition-colors duration-150 focus:outline-none whitespace-nowrap ${vibeInputMethod === tab.key ? 'border-[#A85C36] text-[#A85C36] bg-[#F8F5F2]' : 'border-transparent text-[#332B42] bg-transparent hover:bg-[#F3F2F0]'}`}
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
        {vibeInputMethod === 'image' && (
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
                      toast.error('Please upload a valid image file.');
                      setInspirationImage(null);
                      setImagePreview(null);
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('Image must be less than 5MB.');
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
                            toast.error('Please upload a valid image file.');
                            setInspirationImage(null);
                            setImagePreview(null);
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Image must be less than 5MB.');
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
                          toast.error('Could not extract vibes from image.');
                        }
                      } catch (err) {
                        toast.error('Failed to generate vibes.');
                      } finally {
                        setVibeLoading(false);
                      }
                    }}
                    style={{ textTransform: 'none' }}
                    disabled={vibeLoading}
                  >
                    <WandSparkles className="w-4 h-4 mr-2" />
                    {vibeLoading ? 'Generating...' : 'Generate vibe'}
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
                toast.error("Please select at least one vibe, upload an image, or provide a Pinterest link");
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
                  imagePreview: imagePreview || null,
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
          {[0, 1, 2, 3].map((n) => (
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
      What's your wedding budget?
    </h1>
    <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-left w-full">
      Use the slider below to set your minimum and maximum budget.
    </h4>
    <form className="w-full max-w-md space-y-8">
      <div className="mb-6">
        <div className="text-lg font-semibold text-[#332B42] mb-2 text-center">
          Your budget: <span className="text-[#A85C36]">${budgetRange[0].toLocaleString()}</span> - <span className="text-[#A85C36]">${budgetRange[1].toLocaleString()}</span>
        </div>
        <div className="flex flex-col gap-6 items-center">
          <div className="w-full px-2">
            <Slider
              range
              min={minAllowed}
              max={maxAllowed}
              step={STEP}
              value={budgetRange}
              onChange={vals => setBudgetRange(Array.isArray(vals) ? vals : [vals, vals])}
              allowCross={false}
              trackStyle={[{ backgroundColor: '#A85C36', height: 8 }]}
              handleStyle={[
                { backgroundColor: '#A85C36', height: 20, width: 20, marginTop: -6 },
                { backgroundColor: '#A85C36', height: 20, width: 20, marginTop: -6 }
              ]}
              railStyle={{ backgroundColor: '#E0D6D0', height: 8 }}
            />
            <div className="flex justify-between w-full text-xs text-[#332B42] mt-1">
              <span>${minAllowed.toLocaleString()}</span>
              <span>${maxAllowed.toLocaleString()}+</span>
            </div>
          </div>
        </div>
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
              // Save step 5 data and mark as onboarded
              const saveAndComplete = async () => {
                const step5Data = {
                  budgetRange: {
                    min: budgetRange[0],
                    max: budgetRange[1],
                  },
                  onboarded: true,
                  onboardingCompletedAt: new Date(),
                };
                
                console.log('Completing onboarding with data:', step5Data);
                const success = await saveOnboardingData(step5Data);
                if (success) {
                  console.log('Onboarding completed successfully, showing toast and redirecting...');
                  toast.success("Welcome to Paige! Your wedding planning journey begins now.");
                  // Add a small delay to ensure Firestore has updated before redirect
                  setTimeout(() => {
                    console.log('Redirecting to dashboard...');
                    router.push("/");
                  }, 1000);
                } else {
                  console.error('Failed to complete onboarding');
                }
              };
              
              saveAndComplete();
            }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Complete"}
          </button>
        </div>
        <div className="flex justify-center items-center gap-2 mt-4">
          {[0, 1, 2, 3].map((n) => (
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

            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-[60%] p-4 m-4 flex items-center justify-center">
          <div className="flex-1 h-full bg-white shadow-md rounded-tl-[30px] rounded-br-[30px] p-4 flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.img
                  key="glasses"
                  src="/glasses.png"
                  alt="Onboarding visual"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                />
              )}
              {step === 2 && (
                <motion.img
                  key="heart"
                  src="/heart.png"
                  alt="Wedding heart illustration"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                />
              )}
              {step === 3 && (
                <motion.img
                  key="weather"
                  src="/weather.png"
                  alt="Wedding style illustration"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                />
              )}
              {step === 4 && (
                <motion.img
                  key="vibe"
                  src="/vibe.png"
                  alt="Vibe inspiration illustration"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                />
              )}
              {step === 5 && (
                <motion.img
                  key="budget"
                  src="/budget.png"
                  alt="Budget illustration"
                  className="max-w-[320px] w-full h-auto opacity-90 absolute"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlacesAutocompleteInput({ value, onChange, setVenueMetadata, setSelectedLocationType, placeholder, types = ['geocode'], disabled = false }: { value: string; onChange: (val: string) => void; setVenueMetadata: (venue: any) => void; setSelectedLocationType: (type: string | null) => void; placeholder: string; types?: string[]; disabled?: boolean }) {
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types,
    },
    debounce: 300,
    defaultValue: value,
  });

  return (
    <div className="relative">
      <input
        value={disabled ? value : inputValue}
        onChange={e => {
          setValue(e.target.value);
          onChange(e.target.value);
          setVenueMetadata(null); // Reset venue metadata on input change
        }}
        disabled={disabled || !ready}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] appearance-none ${disabled ? 'bg-[#F3F2F0] text-[#AB9C95] cursor-not-allowed' : 'bg-white text-[#332B42]'}`}
      />
      {status === "OK" && data.length > 0 && !disabled && (
        <ul className="absolute z-10 bg-white border border-[#AB9C95] rounded mt-1 w-full max-h-48 overflow-y-auto shadow-lg">
          {data.map(({ place_id, description, types }) => (
            <li
              key={place_id}
              className="px-3 py-2 cursor-pointer hover:bg-[#F3F2F0] text-sm"
              onClick={() => {
                setValue(description, false);
                onChange(description);
                clearSuggestions();
                // Set location type for parent
                const allowedTypes = ['locality', 'administrative_area_level_1', 'country'];
                let foundType = null;
                if (types && types.length > 0) {
                  foundType = types.find(type => allowedTypes.includes(type)) || null;
                }
                setSelectedLocationType(foundType);
                // Venue logic
                const venueTypes = ['street_address', 'premise', 'establishment', 'point_of_interest'];
                if (types && types.some(type => venueTypes.includes(type))) {
                  const placesService = new google.maps.places.PlacesService(document.createElement('div'));
                  placesService.getDetails({ placeId: place_id, fields: ['name', 'formatted_address', 'geometry', 'place_id', 'photos', 'rating', 'user_ratings_total', 'types', 'url'] }, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                      setVenueMetadata(place);
                    } else {
                      setVenueMetadata(null);
                    }
                  });
                } else {
                  setVenueMetadata(null);
                }
              }}
            >
              {description}
              <span className="text-xs text-gray-500 ml-2">
                {types?.includes('street_address') ? 'Address' :
                 types?.includes('premise') ? 'Venue' :
                 types?.includes('establishment') ? 'Venue' :
                 types?.includes('point_of_interest') ? 'Venue' :
                 types?.includes('locality') ? 'City' :
                 types?.includes('administrative_area_level_1') ? 'State' :
                 types?.includes('country') ? 'Country' : 'Location'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 