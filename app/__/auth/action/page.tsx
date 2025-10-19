'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AuthActionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuthAction = async () => {
      try {
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');
        const apiKey = searchParams.get('apiKey');

        console.log('Auth action params:', { mode, oobCode, apiKey });

        if (mode === 'verifyEmail' && oobCode) {
          // This is an email verification link
          console.log('Processing email verification...');
          
          // Wait a moment for Firebase to process the verification
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if user is now verified
          if (user && user.emailVerified) {
            console.log('Email verified successfully!');
            showSuccessToast('Email verified successfully! Welcome to Paige!');
            
            // Redirect to signup page with verification success
            router.push('/signup?verified=true');
          } else {
            console.log('Email verification failed or user not found');
            showErrorToast('Email verification failed. Please try again.');
            router.push('/signup?step=1&verify=true');
          }
        } else {
          console.log('Unknown auth action mode:', mode);
          router.push('/signup');
        }
      } catch (error) {
        console.error('Error processing auth action:', error);
        showErrorToast('An error occurred. Please try again.');
        router.push('/signup');
      } finally {
        setIsProcessing(false);
      }
    };

    if (!loading) {
      handleAuthAction();
    }
  }, [searchParams, user, loading, router, showSuccessToast, showErrorToast]);

  if (loading || isProcessing) {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Processing verification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}