/**
 * Enhanced Login Form Component
 * Works with existing login page to provide better error handling
 */

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthError } from '@/hooks/useAuthError';
import { useCustomToast } from '@/hooks/useCustomToast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/LoadingSpinner';

interface EnhancedLoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function EnhancedLoginForm({ onSuccess, className = '' }: EnhancedLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { showErrorToast } = useCustomToast();
  const { error, handleError, clearError, getErrorMessage } = useAuthError();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!email || !password) {
      handleError({ code: 'MISSING_FIELDS', message: 'All fields are required' }, 'Form validation');
      return;
    }
    
    if (!emailRegex.test(email)) {
      handleError({ code: 'INVALID_EMAIL', message: 'Please enter a valid email address' }, 'Form validation');
      return;
    }

    try {
      setLoading(true);
      
      // Sign in with Firebase
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Get fresh token
      const idToken = await result.user.getIdToken();
      
      // Call sessionLogin to set the __session cookie
      const sessionRes = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      
      if (!sessionRes.ok) {
        throw new Error('Failed to establish session');
      }

      // Check if user exists in Firestore and get onboarding status
      const userDocRef = doc(db, "users", result.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        // User doesn't exist in Firestore, redirect to signup
        window.location.href = '/signup?existing=1';
        return;
      }

      const userData = userDocSnap.data();
      
      // Set success toast
      if (typeof window !== 'undefined') {
        localStorage.setItem('showLoginToast', '1');
      }

      // Redirect based on onboarding status
      if (userData.onboarded === true) {
        window.location.href = "/";
      } else {
        window.location.href = '/signup?onboarding=1';
      }

      onSuccess?.();

    } catch (error: any) {
      const authError = handleError(error, 'Email login');
      showErrorToast(getErrorMessage(authError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your email"
          required
          autoComplete="email"
        />
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <span className="text-sm text-gray-500 hover:text-gray-700">
              {showPassword ? 'Hide' : 'Show'}
            </span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">
                {getErrorMessage(error)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Logging in...
          </>
        ) : (
          'Log In'
        )}
      </button>
    </form>
  );
}
