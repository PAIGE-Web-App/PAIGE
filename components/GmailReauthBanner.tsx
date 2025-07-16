import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { User } from 'firebase/auth';

interface GmailReauthBannerProps {
  onReauth: () => void;
  currentUser: User | null;
}

export default function GmailReauthBanner({ onReauth, currentUser }: GmailReauthBannerProps) {
  const handleReauth = () => {
    // Open re-authentication in a new tab to preserve the current page state
    const reauthUrl = `/api/auth/google/initiate?userId=${currentUser?.uid}&redirectUri=${encodeURIComponent(window.location.href)}`;
    window.open(reauthUrl, '_blank', 'noopener,noreferrer');
    // Call the original onReauth callback for any additional cleanup
    onReauth();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4"
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
              <RefreshCw className="w-4 h-4" />
              Re-authenticate
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 