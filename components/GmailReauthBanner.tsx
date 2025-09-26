import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { User } from 'firebase/auth';

interface GmailReauthBannerProps {
  onReauth: () => void;
  currentUser: User | null;
}

export default function GmailReauthBanner({ onReauth, currentUser }: GmailReauthBannerProps) {
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
        // Call the original onReauth callback for any additional cleanup
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
      className="bg-yellow-50 border border-yellow-300 border-l-4 border-l-yellow-400 p-3 mb-2 rounded-md shadow-sm"
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
            <button
              onClick={handleReauth}
              className="ml-4 bg-yellow-600 text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className="w-3 h-3" />
              Re-authenticate
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 