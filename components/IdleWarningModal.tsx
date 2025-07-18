'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';

interface IdleWarningModalProps {
  isOpen: boolean;
  onStayLoggedIn: () => void;
  timeRemaining: number; // seconds remaining
}

export default function IdleWarningModal({ 
  isOpen, 
  onStayLoggedIn, 
  timeRemaining 
}: IdleWarningModalProps) {
  const [countdown, setCountdown] = useState(timeRemaining);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(timeRemaining);
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Session Timeout Warning
                </h3>
                <p className="text-sm text-gray-600">
                  You've been inactive for a while
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                For your security, you'll be automatically logged out in:
              </p>
              <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <Clock className="h-5 w-5 text-red-500" />
                <span className="text-xl font-mono font-bold text-red-600">
                  {formatTime(countdown)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onStayLoggedIn}
                className="flex-1 bg-[#A85C36] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#8B4A2A] transition-colors"
              >
                Stay Logged In
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Logout Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 