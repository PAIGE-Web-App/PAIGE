'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
}

export default function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { user, loading, needsEmailVerification } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only check for email verification if user is authenticated and not loading
    if (!loading && user && needsEmailVerification) {
      // Redirect to signup page for email verification (without verified=true parameter)
      router.push('/signup?step=1&verify=true');
    }
  }, [user, loading, needsEmailVerification, router]);

  // If user needs email verification, don't render children
  if (!loading && user && needsEmailVerification) {
    return null;
  }

  // Otherwise, render children normally
  return <>{children}</>;
}