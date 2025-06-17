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
    if (!authLoading && user && !isNewSignup) {
      // Only redirect if user is onboarded
      const checkOnboarded = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().onboarded === true) {
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
        await setDoc(doc(db, "users", result.user.uid), {
          email: result.user.email,
          onboarded: false,
          createdAt: new Date(),
        }, { merge: true });
        setIsNewSignup(true);
        setStep(2);
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

  if (!authLoading && user && onboarded === true) {
    router.push('/');
    return null;
  }

  if (!authLoading && user && onboarded === false && step === 1) {
    setStep(2);
  }

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

                    <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
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

    <form className="w-full max-w-xs space-y-4">
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
  className={`w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] text-sm text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] bg-white appearance-none ${undecidedDate ? "text-[#999]" : ""}`}
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


     <button
  type="button"
  className="btn-primary w-full mt-6"
  disabled={
    !userName.trim() ||
    !partnerName.trim() ||
    (!undecidedDate && !weddingDate)
  }
  onClick={async () => {
    console.log('Continue button clicked on step 2');
    const errors: { userName?: string; partnerName?: string } = {};
    if (!userName.trim()) {
      console.log('Missing userName');
      errors.userName = "Your name is required";
      return;
    }
    if (!partnerName.trim()) {
      console.log('Missing partnerName');
      errors.partnerName = "Partner's name is required";
      return;
    }
    if (!undecidedDate) {
      if (weddingDate) {
        const selectedDate = new Date(weddingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          console.log('Selected date is in the past');
          setWeddingDateError("Please select a future date.");
          return;
        } else {
          setWeddingDateError("");
        }
      } else {
        console.log('No wedding date and not undecided');
        setWeddingDateError("");
      }
    } else {
      setWeddingDateError("");
    }
    if (Object.keys(errors).length > 0) {
      console.log('Step 2 errors:', errors);
      setStep2Errors(errors);
      return;
    } else {
      setStep2Errors({});
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          console.log('Saving onboarding data and advancing to step 3');
          await setDoc(doc(db, "users", user.uid), {
            userName: userName.trim(),
            partnerName: partnerName.trim(),
            weddingDate: weddingDate ? Timestamp.fromDate(new Date(weddingDate)) : null,
            email: user.email,
            onboarded: false,
            createdAt: new Date(),
          }, { merge: true });
          setStep(3);
        } else {
          console.log('No authenticated user.');
          console.error("No authenticated user.");
        }
      } catch (error) {
        console.log('Error saving onboarding data:', error);
        console.error("Error saving onboarding data:", error);
      }
    }
  }}
>
  Continue
</button>

    {/* Step Indicator (dots, onboarding steps only) */}
    <div className="flex justify-center items-center mt-12 gap-2">
      {[1, 2].map((n) => (
        <span
          key={n}
          className={`h-2 w-2 rounded-full transition-all duration-200 ${step === n + 1 ? 'bg-[#A85C36]' : 'bg-[#E0D6D0]'}`}
        />
      ))}
    </div>

    </form>
  </>
)}
{step === 3 && (
  <>
    <h1 className="text-[#332B42] text-2xl font-playfair font-semibold mb-4 text-left w-full">
      Tell us about your dream wedding
    </h1>
    <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-left w-full">
      Help us understand your preferences so we can personalize your experience.
    </h4>
    <form className="w-full max-w-xs space-y-4">
      <div>
        <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
          Wedding Style
        </label>
        <input
          type="text"
          placeholder="e.g. Classic, Modern, Rustic, etc."
          className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
        />
      </div>
      <div>
        <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
          Wedding Size
        </label>
        <input
          type="text"
          placeholder="e.g. Small, Medium, Large"
          className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
        />
      </div>
      <div>
        <label className="block text-xs text-[#332B42] font-work-sans font-normal mb-1">
          Religious or Cultural Preferences
        </label>
        <input
          type="text"
          placeholder="e.g. Catholic, Jewish, Hindu, None, etc."
          className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
        />
      </div>
      {/* Add more fields as needed */}
      <div className="flex justify-between items-center mt-8 gap-4">
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
          onClick={() => setStep(4)}
        >
          Continue
        </button>
      </div>
    </form>
    {/* Step Indicator for onboarding steps only (dots) */}
    <div className="flex justify-center items-center mt-12 gap-2">
      {[1, 2].map((n) => (
        <span
          key={n}
          className={`h-2 w-2 rounded-full transition-all duration-200 ${step === n + 1 ? 'bg-[#A85C36]' : 'bg-[#E0D6D0]'}`}
        />
      ))}
    </div>
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
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
} 