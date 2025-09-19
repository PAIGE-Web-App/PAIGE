'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, Home, RefreshCw, Clock } from 'lucide-react';

export default function RateLimitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(30);
  const [canRetry, setCanRetry] = useState(false);

  // Get retry time from URL params or default to 30 seconds
  useEffect(() => {
    const retryAfter = searchParams.get('retryAfter');
    if (retryAfter) {
      const retryTime = parseInt(retryAfter, 10);
      if (!isNaN(retryTime)) {
        setCountdown(retryTime);
      }
    }
  }, [searchParams]);

  // Handle countdown for retry
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanRetry(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCanRetry(true);
    }
  }, [countdown]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8 text-center"
      >
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Too Many Login Attempts
        </h1>

        {/* Error Message */}
        <p className="text-gray-600 mb-6">
          You've made too many authentication attempts in a short period. This is a security measure to protect your account.
        </p>

        {/* Countdown Timer */}
        {countdown > 0 && (
          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-yellow-700">
              <Clock className="w-5 h-5" />
              <span className="font-medium">
                You can try again in: {formatTime(countdown)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {canRetry && (
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
          )}

          <button
            onClick={handleGoHome}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go to Home
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-sm text-gray-500">
          <p>This usually happens when there are multiple login attempts in quick succession. Please wait before trying again.</p>
        </div>
      </motion.div>
    </div>
  );
}
