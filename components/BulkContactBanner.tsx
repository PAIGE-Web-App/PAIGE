import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MailPlus } from 'lucide-react';

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
                <MailPlus className="w-5 h-5" strokeWidth={1} />
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