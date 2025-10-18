import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmailVerification, reload } from 'firebase/auth';
import { useCustomToast } from '@/hooks/useCustomToast';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react';

interface EmailVerificationRequiredProps {
  onVerified?: () => void;
}

export default function EmailVerificationRequired({ onVerified }: EmailVerificationRequiredProps) {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Check if email is verified every 5 seconds
  useEffect(() => {
    if (!user) return;

    const checkVerification = async () => {
      try {
        await reload(user);
        if (user.emailVerified) {
          showSuccessToast('Email verified successfully!');
          onVerified?.();
        }
      } catch (error) {
        console.error('Error checking email verification:', error);
      }
    };

    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, [user, onVerified, showSuccessToast]);

  const handleResendVerification = async () => {
    if (!user || isResending || resendCooldown > 0) return;

    try {
      setIsResending(true);
      await sendEmailVerification(user);
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="text-center p-8">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600 mb-8">
            We've sent a verification link to{' '}
            <span className="font-semibold text-gray-900">{user?.email}</span>
          </p>
          
          <div className="text-center text-sm text-gray-600 mb-6">
            <p>Please check your email and click the verification link to continue.</p>
            <p className="mt-2">Don't see the email? Check your spam folder.</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full btn-primaryinverse flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="text-center text-xs text-gray-500 mt-6">
            <p>Having trouble? Contact support for assistance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


