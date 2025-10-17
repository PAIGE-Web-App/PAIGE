'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthActionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    const oobCodeParam = searchParams.get('oobCode');
    
    setMode(modeParam);
    setOobCode(oobCodeParam);

    if (modeParam === 'resetPassword' && oobCodeParam) {
      // Verify the password reset code
      verifyPasswordResetCode(auth, oobCodeParam)
        .then(() => {
          // Code is valid, redirect to password reset page
          router.push(`/reset-password?code=${oobCodeParam}`);
        })
        .catch((error) => {
          console.error('Error verifying password reset code:', error);
          setError('Invalid or expired password reset link. Please request a new one.');
          setLoading(false);
        });
    } else {
      setError('Invalid password reset link.');
      setLoading(false);
    }
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F4]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A85C36] mx-auto mb-4"></div>
          <p className="text-[#332B42] font-work-sans">Verifying your password reset link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F4]">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-[#332B42] mb-4 font-work-sans">Invalid Link</h1>
            <p className="text-[#7A7A7A] mb-6 font-work-sans">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="btn-primary w-full"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
