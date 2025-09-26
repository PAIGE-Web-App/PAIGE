import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GmailLoginReauthBannerProps {
  onReauth: () => void;
  onDismiss: () => void;
}

export default function GmailLoginReauthBanner({ onReauth, onDismiss }: GmailLoginReauthBannerProps) {
  const handleReauth = async () => {
    try {
      // Import Firebase auth dynamically to avoid SSR issues
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      const provider = new GoogleAuthProvider();
      // Only request Gmail scopes for Gmail re-authentication
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      // Force account selection and consent
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline'
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
        onReauth();
      } else {
        console.error('❌ Gmail reauth failed');
      }
    } catch (error: any) {
      console.error('❌ Gmail reauth error:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-50 border border-yellow-300 border-l-4 border-l-yellow-400 p-4 mb-4 rounded-md shadow-sm"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Gmail Re-authentication Required
              </h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>
                  Your Gmail access has expired. You need to re-authenticate before logging in to use Gmail features.
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="ml-2 text-yellow-400 hover:text-yellow-600"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={handleReauth}
              className="bg-yellow-600 text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              Re-authenticate Gmail
            </button>
            <button
              onClick={onDismiss}
              className="text-yellow-700 bg-yellow-100 px-4 py-2 text-sm font-medium rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Continue without Gmail
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 