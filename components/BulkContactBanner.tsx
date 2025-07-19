import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkContactBannerProps {
  isVisible: boolean;
}

export default function BulkContactBanner({ isVisible }: BulkContactBannerProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.3
          }}
        >
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-lg shadow-lg mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0L9.937 15.5Z" />
                </svg>
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-sm mb-1 text-white">Bulk Contact with AI</h5>
                <p className="text-sm opacity-90 text-white">
                  Select the vendors you'd like to message all at once using AI! Once you've selected your vendors, click the Contact Vendors in Bulk button in the footer below to get in touch with multiple vendors efficiently and save time on your wedding planning.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 