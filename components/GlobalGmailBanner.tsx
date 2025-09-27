'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useGmailAuth } from '@/contexts/GmailAuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';

export default function GlobalGmailBanner() {
  const { needsReauth, isLoading, checkGmailAuth, dismissBanner } = useGmailAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  const handleReauth = async () => {
    if (isLoading) return; // Prevent multiple simultaneous reauth attempts
    
    try {
      // Import Firebase auth dynamically to avoid SSR issues
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      const provider = new GoogleAuthProvider();
      // Only request Gmail scopes for Gmail re-authentication
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      
      // Force consent screen with proper parameters (avoiding conflict)
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline',
        include_granted_scopes: 'true'
      });
      
      const result = await signInWithPopup(auth, provider);
      
      // Store Gmail tokens from the popup
      try {
        const { GoogleAuthProvider } = await import('firebase/auth');
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;
        
        if (accessToken) {
          // Import Firestore functions
          const { doc, updateDoc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          // Store Gmail tokens in Firestore (matching API expected format)
          const gmailTokens = {
            accessToken: accessToken,
            refreshToken: null, // Firebase popup doesn't provide refresh token
            expiryDate: Date.now() + 24 * 3600 * 1000, // 24 hours from now
            email: result.user.email, // Store Gmail account email
            scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
          };
          
          // Check if user exists before updating
          const userDocRef = doc(db, "users", result.user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            // Update user document with Gmail tokens
            await updateDoc(userDocRef, {
              googleTokens: gmailTokens,
              gmailConnected: true,
            });
          }
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('gmailConnected', 'true');
          }
        }
      } catch (tokenError) {
        console.error('❌ Error storing Gmail tokens:', tokenError);
      }
      
      // Get ID token and call session login
      const idToken = await result.user.getIdToken();
      const res = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      
      if (res.ok) {
        // Small delay to ensure tokens are stored
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Dismiss the banner immediately without calling checkGmailAuth
        dismissBanner();
        // Show success toast
        showSuccessToast('Gmail integration re-enabled');
      } else {
        console.error('❌ Gmail reauth failed');
        showErrorToast('Failed to re-enable Gmail integration');
      }
    } catch (error: any) {
      console.error('❌ Gmail reauth error:', error);
      showErrorToast('Failed to re-enable Gmail integration');
    }
  };

  if (!needsReauth) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-yellow-50 border border-yellow-300 border-l-4 border-l-yellow-400 p-3 shadow-lg"
        style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
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
                  className="btn-primary flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
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
