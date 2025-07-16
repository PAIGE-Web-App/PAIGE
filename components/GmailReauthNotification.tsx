import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'firebase/auth';

interface GmailReauthNotificationProps {
  isVisible: boolean;
  onReauth: () => void;
  onDismiss: () => void;
  currentUser: User | null;
}

export default function GmailReauthNotification({ 
  isVisible, 
  onReauth, 
  onDismiss,
  currentUser
}: GmailReauthNotificationProps) {
  const handleReauth = () => {
    // Open re-authentication in a new tab to preserve the current page state
    const reauthUrl = `/api/auth/google/initiate?userId=${currentUser?.uid}&redirectUri=${encodeURIComponent(window.location.href)}`;
    window.open(reauthUrl, '_blank', 'noopener,noreferrer');
    // Call the original onReauth callback for any additional cleanup
    onReauth();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 max-w-sm"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Gmail Authentication Expired
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Your Gmail access has expired. You need to re-authenticate to send emails.
                </p>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={handleReauth}
                  className="bg-yellow-600 text-white px-3 py-1.5 text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Re-authenticate
                </button>
                <button
                  onClick={onDismiss}
                  className="bg-yellow-100 text-yellow-800 px-3 py-1.5 text-sm font-medium rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={onDismiss}
                className="bg-yellow-50 rounded-md inline-flex text-yellow-400 hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 