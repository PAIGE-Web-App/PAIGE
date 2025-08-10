import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface BannerProps {
  message: React.ReactNode;
  type: 'info' | 'warning' | 'error';
  onDismiss?: () => void;
  className?: string;
}

const Banner: React.FC<BannerProps> = ({ message, type, onDismiss, className = '' }) => {
  const bgColor = type === 'info' ? 'bg-blue-100' : type === 'warning' ? 'bg-yellow-100' : 'bg-red-100';
  const textColor = type === 'info' ? 'text-blue-800' : type === 'warning' ? 'text-yellow-800' : 'bg-red-800';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`relative ${bgColor} ${textColor} p-2 text-sm rounded-[5px] flex items-center justify-between mx-4 my-2 ${className}`}
    >
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button 
          onClick={onDismiss} 
          className="ml-4 p-1 rounded-full hover:bg-opacity-75 transition-colors"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      )}
    </motion.div>
  );
};

export default Banner;
