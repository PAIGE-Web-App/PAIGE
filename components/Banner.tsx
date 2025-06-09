import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BannerProps {
  message: ReactNode; // Changed from string to ReactNode
  type?: 'info' | 'warning' | 'error' | 'feature'; // 'info' for informational, 'warning' for yellow, 'error' for red, 'feature' for purple
  onDismiss?: () => void; // Optional dismiss handler
  isLoading?: boolean; // Add loading state
}

const Banner: React.FC<BannerProps> = ({ message, type = 'info', onDismiss, isLoading = false }) => {
  let bgColorClass = '';
  let textColorClass = '';
  let dismissHoverColorClass = '';
  let extraClass = '';

  switch (type) {
    case 'warning':
      bgColorClass = 'bg-yellow-100';
      textColorClass = 'text-yellow-800';
      dismissHoverColorClass = 'hover:bg-yellow-200';
      break;
    case 'error':
      bgColorClass = 'bg-red-100';
      textColorClass = 'text-red-800';
      dismissHoverColorClass = 'hover:bg-red-200';
      break;
    case 'feature':
      bgColorClass = 'bg-purple-100';
      textColorClass = 'text-purple-800';
      dismissHoverColorClass = 'hover:bg-purple-200';
      extraClass = 'mt-0 rounded-none';
      break;
    case 'info':
    default:
      bgColorClass = 'bg-blue-100';
      textColorClass = 'text-blue-800';
      dismissHoverColorClass = 'hover:bg-blue-200';
      break;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`text-sm py-2 mt-3 mb-2 relative flex items-center justify-start px-4 ${bgColorClass} ${textColorClass} ${extraClass}`}
      >
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-opacity-50 bg-current rounded w-48"></div>
          </div>
        ) : (
          <span>{message}</span>
        )}
        {onDismiss && !isLoading && (
          <button
            onClick={onDismiss}
            className={`absolute top-1 right-1 p-1 rounded-full ${textColorClass} ${dismissHoverColorClass} transition-colors`}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default Banner;
