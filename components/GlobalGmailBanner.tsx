'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useGmailAuth } from '@/contexts/GmailAuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';
import { addGmailScopes } from '@/lib/gmailScopes';

export default function GlobalGmailBanner() {
  const { needsReauth, isLoading, checkGmailAuth, dismissBanner } = useGmailAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);
  const [isReauthLoading, setIsReauthLoading] = useState(false);

  // DEBUG: Log when component renders
  console.log('GlobalGmailBanner render: needsReauth =', needsReauth);

  const handleReauth = async () => {
    if (isReauthLoading) return; // Prevent multiple simultaneous reauth attempts
    setIsReauthLoading(true);
    
    try {
      // Import Firebase auth dynamically to avoid SSR issues
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      const provider = new GoogleAuthProvider();
      // Only request Gmail scopes for Gmail re-authentication
      addGmailScopes(provider);
      
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
          
          // Construct the scope string from the scopes we requested
          const { getGmailCalendarScopeString } = await import('@/lib/gmailScopes');
          const requestedScopes = getGmailCalendarScopeString();
          
          console.log('Gmail reauth: Using scopes:', requestedScopes);
          
          // Store Gmail tokens in Firestore (matching API expected format)
          const gmailTokens = {
            accessToken: accessToken,
            refreshToken: null, // Firebase popup doesn't provide refresh token
            expiryDate: Date.now() + 24 * 3600 * 1000, // 24 hours from now
            email: result.user.email, // Store Gmail account email
            scope: requestedScopes // Use the scopes we requested
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
        
        // Trigger Gmail auth check to update the Gmail auth context
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gmail-auth-updated'));
        }
        
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
    } finally {
      setIsReauthLoading(false);
    }
  };

  if (!needsReauth) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-yellow-50 border border-yellow-300 border-l-4 border-l-yellow-400 p-3 shadow-lg w-full"
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
                  <div className="mt-1 text-sm text-yellow-700 font-work">
                    <p>
                      Your Gmail access has expired. You need to re-authenticate and approve all scopes to send emails, import Gmail messages, and sync your calendar.{' '}
                      <button 
                        onClick={() => setShowLearnMoreModal(true)}
                        className="text-yellow-800 underline hover:text-yellow-900 font-medium"
                      >
                        Learn more
                      </button>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReauth}
                    disabled={isReauthLoading}
                    className="btn-primary flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isReauthLoading ? 'animate-spin' : ''}`} />
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

      {/* Learn More Modal */}
      <AnimatePresence>
        {showLearnMoreModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
            onClick={() => setShowLearnMoreModal(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header row with icon, title and close button */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                </div>
                <h5 className="h5">Gmail Permissions Explained</h5>
              </div>
              <button
                onClick={() => setShowLearnMoreModal(false)}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Description */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 text-left font-work">
                To take full advantage of Paige's communication and todo management features, 
                you need to approve all Gmail and Calendar permissions when re-authenticating.
              </p>
            </div>

            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3 font-work">Why you need these permissions:</h6>
              <ul className="space-y-3">
                <li className="flex items-start text-sm text-gray-600 font-work">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Send emails:</strong> Draft and send vendor emails directly from Paige
                  </div>
                </li>
                <li className="flex items-start text-sm text-gray-600 font-work">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Import Gmail messages:</strong> Analyze your vendor conversations for todo items
                  </div>
                </li>
                <li className="flex items-start text-sm text-gray-600 font-work">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Sync calendar:</strong> Automatically add wedding deadlines to your Google Calendar
                  </div>
                </li>
                <li className="flex items-start text-sm text-gray-600 font-work">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Manage todos:</strong> Create and track wedding tasks from your email conversations
                  </div>
                </li>
              </ul>
            </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setShowLearnMoreModal(false)}
                  className="btn-primary px-6 py-2"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
