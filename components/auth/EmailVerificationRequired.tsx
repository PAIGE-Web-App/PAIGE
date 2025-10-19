import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmailVerification, reload } from 'firebase/auth';
import { useCustomToast } from '@/hooks/useCustomToast';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';

interface EmailVerificationRequiredProps {
  onVerified?: () => void;
}

export default function EmailVerificationRequired({ onVerified }: EmailVerificationRequiredProps) {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // DISABLED: Automatic email verification checker
  // This was causing the blank screen issue by automatically calling onVerified()
  // when user.emailVerified became true, even if the user hadn't actually verified
  // useEffect(() => {
  //   if (!user) return;
  //
  //   const checkVerification = async () => {
  //     try {
  //       console.log('🔍 [AUTO-CHECK] Checking email verification status...');
  //       await reload(user);
  //       console.log('🔍 [AUTO-CHECK] user.emailVerified:', user.emailVerified);
  //       if (user.emailVerified) {
  //         console.log('✅ [AUTO-CHECK] Email verified! Calling onVerified callback');
  //         showSuccessToast('Email verified successfully!');
  //         onVerified?.();
  //       } else {
  //         console.log('⏳ [AUTO-CHECK] Email not yet verified');
  //       }
  //     } catch (error) {
  //       console.error('❌ [AUTO-CHECK] Error checking email verification:', error);
  //     }
  //   };
  //
  //   const interval = setInterval(checkVerification, 5000);
  //   return () => clearInterval(interval);
  // }, [user, onVerified, showSuccessToast]);

  const handleResendVerification = async () => {
    if (!user || isResending || resendCooldown > 0) return;

    try {
      setIsResending(true);
      await sendEmailVerification(user, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: false
      });
      showSuccessToast('Verification email sent! Check your inbox.');
      setResendCooldown(60); // 60 second cooldown
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      showErrorToast('Failed to send verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleManualCheck = async () => {
    if (!user) return;

    try {
      setIsChecking(true);
      await reload(user);
      if (user.emailVerified) {
        showSuccessToast('Email verified successfully!');
        onVerified?.();
      } else {
        showErrorToast('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      showErrorToast('Failed to check verification status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#F3F2F0] flex justify-center overflow-x-hidden">
      <div className="w-full max-w-[1280px] flex">
        <div className="w-full lg:w-[40%] lg:min-w-[400px] flex flex-col justify-center items-start px-8">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
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
                  Verify Your Email
                </h1>
                <h4 className="text-[#364257] text-sm font-playfair font-normal mb-6 text-center w-full">
                  We've sent a verification link to <span className="font-semibold text-[#A85C36]">{user?.email}</span>
                </h4>

                <div className="w-full max-w-md space-y-4">
                  <div className="text-center text-sm text-[#364257] mb-6">
                    <p>Please check your email and click the verification link to continue.</p>
                    <p className="mt-2">Don't see the email? Check your spam folder.</p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleManualCheck}
                      disabled={isChecking}
                      className="w-full btn-primaryinverse flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-[#AB9C95] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChecking ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          I've Verified My Email
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleResendVerification}
                      disabled={isResending || resendCooldown > 0}
                      className="w-full btn-primary flex items-center justify-center gap-2 py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : resendCooldown > 0 ? (
                        `Resend in ${resendCooldown}s`
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Resend Verification Email
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center text-xs text-[#AB9C95] mt-6">
                    <p>Having trouble? Contact support for assistance.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hidden lg:flex w-[60%] p-4 m-4 items-center justify-center">
          <motion.div 
            className="flex-1 h-full shadow-md rounded-tl-[30px] rounded-br-[30px] relative overflow-hidden bg-white p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div 
              className="w-full h-full rounded-tl-[30px] rounded-br-[30px] relative overflow-hidden"
              style={{
                backgroundImage: "url('/api/optimize-image?src=/clean3.png&f=webp&q=85&w=800')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              }}
            >
                {/* White overlay */}
                <div className="absolute inset-0 bg-white bg-opacity-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


