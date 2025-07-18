import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ContactModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

const ContactModalBase: React.FC<ContactModalBaseProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-md md:w-[400px]",
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex bg-black bg-opacity-40 overflow-hidden justify-center items-end md:items-center"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={`relative w-full h-[95vh] rounded-t-[15px] bg-white flex flex-col overflow-hidden md:h-auto md:max-h-[90vh] md:rounded-[15px] ${maxWidth}`}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-white border-b border-[#AB9C95] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-playfair text-[#332B42]">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-1"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {children}
            </div>

            {/* Fixed Footer */}
            {footer && (
              <div className="flex-shrink-0 bg-white border-t border-[#AB9C95] px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContactModalBase; 