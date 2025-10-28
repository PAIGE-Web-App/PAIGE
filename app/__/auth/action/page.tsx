'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Firebase Auth Action Handler
 * This page handles Firebase authentication actions like:
 * - Password reset (mode=resetPassword)
 * - Email verification (mode=verifyEmail)
 * - Recover email (mode=recoverEmail)
 */
export default function FirebaseActionHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    const continueUrl = searchParams.get('continueUrl');

    if (!mode || !oobCode) {
      console.error('Missing mode or oobCode');
      router.push('/login');
      return;
    }

    // Route to appropriate handler based on mode
    switch (mode) {
      case 'resetPassword':
        // Redirect to our custom reset password page with the oobCode
        router.push(`/reset-password?oobCode=${oobCode}`);
        break;
        
      case 'verifyEmail':
        // Redirect to our custom email verification page
        router.push(`/verify-email?mode=verifyEmail&oobCode=${oobCode}`);
        break;
        
      case 'recoverEmail':
        // For email recovery, redirect to login with a message
        router.push('/login?message=email-recovered');
        break;
        
      default:
        console.error('Unknown action mode:', mode);
        router.push('/login');
    }
  }, [searchParams, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F6F4]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A85C36] mx-auto mb-4"></div>
        <p className="text-[#332B42] font-work-sans">Processing request...</p>
      </div>
    </div>
  );
}

