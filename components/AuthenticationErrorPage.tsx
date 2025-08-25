import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, Home, RefreshCw, LogOut, Clock } from 'lucide-react';

interface AuthenticationErrorPageProps {
  error?: {
    error?: string;
    message?: string;
    retryAfter?: number;
  };
  onRetry?: () => void;
}

const AuthenticationErrorPage: React.FC<AuthenticationErrorPageProps> = ({ 
  error, 
  onRetry 
}) => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(error?.retryAfter || 0);
  const [canRetry, setCanRetry] = useState(false);

  // Handle countdown for retry
  useEffect(() => {
    if (error?.retryAfter && error.retryAfter > 0) {
      setCountdown(error.retryAfter);
      
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
  }, [error?.retryAfter]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleLogout = () => {
    // Clear any stored auth tokens
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    
    // Redirect to login
    router.push('/login');
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
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Authentication Error
        </h1>

        {/* Error Message */}
        <p className="text-gray-600 mb-6">
          {error?.message || 'Something went wrong with your authentication. Please try again.'}
        </p>

        {/* Countdown Timer */}
        {countdown > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <Clock className="w-5 h-5" />
              <span className="font-medium">
                You can retry in: {formatTime(countdown)}
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

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-sm text-gray-500">
          <p>If this problem persists, try signing out and signing back in.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthenticationErrorPage;
