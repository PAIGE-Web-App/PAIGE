"use client";

import { db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useState, useEffect } from "react";
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

  // Check for toast message in cookies
  useEffect(() => {
    const showToast = document.cookie.includes('show-toast');
    const fromRedirect = document.referrer && !document.referrer.endsWith('/login') && !document.referrer.endsWith('/signup');
    if (showToast && fromRedirect) {
      toast.error('Please login to access this page');
      document.cookie = 'show-toast=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      console.log('SIGNUP: Showing and clearing show-toast cookie');
    }
  }, []);

  // Redirect if already logged in, but only if not a new signup
  useEffect(() => {
    if (!authLoading && user && !isNewSignup) {
      router.push('/');
    }
  }, [user, authLoading, router, isNewSignup]);

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

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      setIsNewSignup(true); // Mark as new signup
      setStep(2); // Go to next onboarding step
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        toast.error("Looks like you're already a user. Please log in.");
        setTimeout(() => {
          router.push("/login?existing=1");
        }, 1500);
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
        setStep(2); // Go to next onboarding step
      } else {
        toast.error("Session login failed");
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        toast.error("Looks like you're already a user. Please log in.");
        setTimeout(() => {
          router.push("/login?existing=1");
        }, 1500);
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

  if (!authLoading && user && !isNewSignup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F3F2F0]">
        <div className="bg-white p-8 rounded shadow-md flex flex-col items-center">
          <h2 className="text-2xl font-playfair font-semibold text-[#332B42] mb-4">You are already logged in</h2>
          <p className="mb-6 text-[#364257]">Go to your dashboard or log out to create a new account.</p>
          <button
            className="btn-primary px-6 py-2 rounded-[8px] font-semibold text-base mb-2"
            onClick={() => router.push('/')}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                  autoComplete="email"
                />
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
                    placeholder="Password"
                    className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-[#A85C36]"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.981 8.75C4.454 10.872 5.622 12.871 7.18 14.39c1.594 1.55 3.554 2.58 5.62 2.75a9.75 9.75 0 005.62-2.75c1.558-1.519 2.726-3.518 3.199-5.62H3.98z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
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
                    className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-[#A85C36]"
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.981 8.75C4.454 10.872 5.622 12.871 7.18 14.39c1.594 1.55 3.554 2.58 5.62 2.75a9.75 9.75 0 005.62-2.75c1.558-1.519 2.726-3.518 3.199-5.62H3.98z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
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
                className="btn-primaryinverse w-full py-2 text-base font-normal rounded-[5px] flex items-center justify-center gap-2"
              >
                <span>🇬🇲</span> Sign up with Gmail
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
    When's the big day?
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
  className={`w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] text-sm text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] bg-white appearance-none ${
    undecidedDate ? "text-[#999]" : ""
  }`}
/>
{weddingDateError && (
  <p className="text-[#A85C36] text-xs mt-1">{weddingDateError}</p>
)}

  </div>
  <label className="mt-2 flex items-center text-sm text-[#332B42] gap-2">
    <input
      type="checkbox"
      checked={undecidedDate}
      onChange={() => setUndecidedDate(!undecidedDate)}
      className="form-checkbox rounded border-[#AB9C95] text-[#A85C36]"
    />
    We haven't decided yet
  </label>
</div>


     <button
  type="button"
  className="btn-primary w-full mt-6"
 onClick={async () => {
  const errors: { userName?: string; partnerName?: string } = {};
  if (!userName.trim()) errors.userName = "Your name is required";
  if (!partnerName.trim()) errors.partnerName = "Partner's name is required";
  if (!undecidedDate && weddingDate) {
  const selectedDate = new Date(weddingDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    setWeddingDateError("Please select a future date.");
    return;
  } else {
    setWeddingDateError("");
  }
}

  if (Object.keys(errors).length > 0) {
    setStep2Errors(errors);
  } else {
    setStep2Errors({});

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          userName: userName.trim(),
          partnerName: partnerName.trim(),
          weddingDate: weddingDate ? Timestamp.fromDate(new Date(weddingDate)) : null,
          email: user.email,
          createdAt: new Date(),
        });
        console.log("User onboarding data saved!");
        router.push("/"); // Redirect to dashboard after saving
      } else {
        console.error("No authenticated user.");
      }
    } catch (error) {
      console.error("Error saving onboarding data:", error);
    }
  }
}}
>
  Complete
</button>

    </form>
  </>
)}

{/* Step 3 is now unused, as Google sign-up also goes to Step 2 */}
{step === 3 && (
  <></>
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