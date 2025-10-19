'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCustomToast } from '@/hooks/useCustomToast';
import { applyActionCode } from 'firebase/auth';

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');
        
        if (mode === 'verifyEmail' && oobCode) {
          console.log('🔗 Processing email verification...', { mode, oobCode });
          
          try {
            // Apply the verification code
            await applyActionCode(auth, oobCode);
            console.log('✅ Verification code applied successfully!');
            
            // Wait for auth to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get current user
            const currentUser = auth.currentUser;
            console.log('👤 Current user:', currentUser ? currentUser.email : 'No user');
            
            if (!currentUser) {
              console.log('❌ No user found after verification');
              setStatus('error');
              showErrorToast('Please sign in first, then try the verification link again.');
              setTimeout(() => router.push('/signup'), 3000);
              return;
            }
            
            console.log('📧 Email verified after applyActionCode:', currentUser.emailVerified);
            
            if (currentUser.emailVerified) {
            console.log('✅ Email verified successfully!');
            setStatus('success');
            showSuccessToast('Email verified successfully!');
            
            // Check if user is already onboarded
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              
              if (userData.onboarded === true) {
                // User is already onboarded, redirect to dashboard
                console.log('✅ User already onboarded, redirecting to dashboard');
                setTimeout(() => {
                  window.location.href = '/dashboard';
                }, 2000);
              } else {
                // User needs to complete onboarding
                console.log('✅ Email verified! Redirecting to signup for onboarding');
                setTimeout(() => {
                  router.push('/signup?step=2');
                }, 2000);
              }
            } else {
              // New user, proceed to onboarding
              console.log('✅ Email verified! Redirecting to signup for new user');
              setTimeout(() => {
                router.push('/signup?step=2');
              }, 2000);
            }
            } else {
              console.log('❌ Email verification failed - email still not verified');
              setStatus('error');
              showErrorToast('Email verification failed. Please try the verification link again.');
              setTimeout(() => router.push('/signup'), 3000);
            }
          } catch (verificationError) {
            console.error('❌ Verification error:', verificationError);
            setStatus('error');
            showErrorToast('Email verification failed. The link may be expired or invalid.');
            setTimeout(() => router.push('/signup'), 3000);
          }
        } else {
          console.log('❌ Invalid verification parameters');
          setStatus('error');
          showErrorToast('Invalid verification link.');
          setTimeout(() => router.push('/signup'), 3000);
        }
      } catch (error) {
        console.error('❌ Verification error:', error);
        setStatus('error');
        showErrorToast('Verification failed. Please try again.');
        setTimeout(() => router.push('/signup'), 3000);
      }
    };

    handleEmailVerification();
  }, [searchParams, showSuccessToast, showErrorToast, router]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-playfair text-gray-800 mb-2">Verifying your email...</h2>
          <p className="text-gray-600">Please wait while we confirm your email address.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-playfair text-gray-800 mb-2">Email Verified!</h2>
          <p className="text-gray-600">Your email has been successfully verified. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-playfair text-gray-800 mb-2">Verification Failed</h2>
        <p className="text-gray-600">There was an error verifying your email. Redirecting...</p>
      </div>
    </div>
  );
}
