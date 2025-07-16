import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowRight } from 'lucide-react';

interface VendorSavedNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  count: number;
}

export default function VendorSavedNotification({ isVisible, onClose, count }: VendorSavedNotificationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 bg-white border border-[#A85C36] rounded-lg shadow-lg p-4 max-w-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Users className="w-5 h-5 text-[#A85C36]" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-[#332B42] mb-1">
                Vendors Added to Contacts!
              </h4>
              <p className="text-sm text-[#AB9C95] mb-3">
                {count} vendor{count !== 1 ? 's' : ''} have been added to your contacts and are now available in your Vendors section.
              </p>
              <div className="flex items-center gap-2">
                <a
                  href="/vendors"
                  className="text-sm text-[#A85C36] hover:text-[#784528] font-medium flex items-center gap-1"
                >
                  View Vendors
                  <ArrowRight className="w-3 h-3" />
                </a>
                <button
                  onClick={onClose}
                  className="text-sm text-[#AB9C95] hover:text-[#332B42] ml-auto"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 