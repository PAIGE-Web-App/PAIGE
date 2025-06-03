import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BannerProps {
  message: string;
  type?: 'info' | 'warning' | 'error'; // 'info' for informational, 'warning' for yellow, 'error' for red
  onDismiss?: () => void; // Optional dismiss handler
}

const Banner: React.FC<BannerProps> = ({ message, type = 'info', onDismiss }) => {
  let bgColorClass = '';
  let textColorClass = '';
  let dismissHoverColorClass = '';

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
    case 'info':
    default:
      bgColorClass = 'bg-[#EBE3DD]'; // Your existing info banner background
      textColorClass = 'text-[#A85C36]'; // Your existing info banner text color
      dismissHoverColorClass = 'hover:bg-[#D6C5B8]'; // Your existing info banner dismiss hover
      break;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`text-sm py-2 rounded-[5px] mt-3 mb-2 relative flex items-center justify-start px-4 ${bgColorClass} ${textColorClass}`}
      >
        <span>{message}</span>
        {onDismiss && (
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
