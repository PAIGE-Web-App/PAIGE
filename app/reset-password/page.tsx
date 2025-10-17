'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useCustomToast } from '@/hooks/useCustomToast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (!codeParam) {
      router.push('/login');
      return;
    }
    setCode(codeParam);
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code) {
      showErrorToast('Invalid reset code');
      return;
    }

    if (password !== confirmPassword) {
      showErrorToast('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showErrorToast('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(auth, code, password);
      showSuccessToast('Password reset successfully! You can now log in with your new password.');
      router.push('/login');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      showErrorToast('Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F4]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A85C36]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F6F4]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <img 
              src="/PaigeFinal.png" 
              alt="Paige AI" 
              className="w-24 h-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-[#332B42] font-work-sans">Reset Your Password</h1>
            <p className="text-[#7A7A7A] mt-2 font-work-sans">Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#332B42] mb-2 font-work-sans">
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:border-transparent font-work-sans"
                placeholder="Enter your new password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#332B42] mb-2 font-work-sans">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:border-transparent font-work-sans"
                placeholder="Confirm your new password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-[#A85C36] hover:text-[#8B4A2A] font-work-sans"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
