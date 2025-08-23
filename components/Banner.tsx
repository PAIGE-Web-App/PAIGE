import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface BannerProps {
  message: React.ReactNode;
  type: 'info' | 'warning' | 'error';
  onDismiss?: () => void;
  className?: string;
  expandableContent?: React.ReactNode;
}

const Banner: React.FC<BannerProps> = ({ message, type, onDismiss, className = '', expandableContent }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const bgColor = type === 'info' ? 'bg-blue-100' : type === 'warning' ? 'bg-yellow-100' : 'bg-red-600';
  const textColor = type === 'info' ? 'text-blue-800' : type === 'warning' ? 'text-yellow-800' : 'text-white';

  return (
    <div className="mx-4 my-2">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`relative ${bgColor} ${textColor} p-2 text-sm rounded-[5px] flex items-center justify-between`}
      >
        <div className="flex-1">{message}</div>
        <div className="flex items-center gap-2">
          {expandableContent && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-full hover:bg-opacity-75 transition-colors"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          {onDismiss && (
            <button 
              onClick={onDismiss} 
              className="p-1 rounded-full hover:bg-opacity-75 transition-colors"
              aria-label="Dismiss banner"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>
      
      {/* Expandable Content */}
      {expandableContent && isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={`${bgColor} ${textColor} p-2 text-sm rounded-[5px] mt-1 border-t border-opacity-20 border-current`}
        >
          {expandableContent}
        </motion.div>
      )}
    </div>
  );
};

export default Banner;
