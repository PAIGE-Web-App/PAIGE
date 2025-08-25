'use client';

import React from 'react';
import AuthenticationErrorPage from '../components/AuthenticationErrorPage';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // Check if this is an authentication-related error
  const isAuthError = error.message.includes('authentication') || 
                     error.message.includes('auth') ||
                     error.message.includes('Too many authentication attempts') ||
                     error.message.includes('authentication loop');

  if (isAuthError) {
    return (
      <AuthenticationErrorPage
        error={{
          error: 'authentication_error',
          message: error.message,
          retryAfter: 0
        }}
        onRetry={reset}
      />
    );
  }

  // For other errors, show a generic error page
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-6">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
