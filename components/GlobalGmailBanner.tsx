'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useGmailAuth } from '@/contexts/GmailAuthContext';

export default function GlobalGmailBanner() {
  const { needsReauth, isLoading, checkGmailAuth, dismissBanner } = useGmailAuth();

  const handleReauth = async () => {
    try {
      // Import Firebase auth dynamically to avoid SSR issues
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      // Force account selection
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      
      // Get ID token and call session login
      const idToken = await result.user.getIdToken();
      const res = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      
      if (res.ok) {
        // Refresh Gmail auth status
        await checkGmailAuth();
      } else {
        console.error('❌ Gmail reauth failed');
      }
    } catch (error: any) {
      console.error('❌ Gmail reauth error:', error);
    }
  };

  if (!needsReauth) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-yellow-50 border border-yellow-300 border-l-4 border-l-yellow-400 p-3 shadow-sm"
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Gmail Authentication Required
                </h3>
                <div className="mt-1 text-sm text-yellow-700">
                  <p>
                    Your Gmail access has expired. You need to re-authenticate to send emails and import Gmail messages.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReauth}
                  disabled={isLoading}
                  className="bg-yellow-600 text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Re-authenticate
                </button>
                <button
                  onClick={dismissBanner}
                  className="text-yellow-600 hover:text-yellow-800 p-1"
                  title="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
