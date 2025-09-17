import React from 'react';
import { motion } from 'framer-motion';

interface VibePillProps {
  vibe: string;
  index: number;
  onClick?: () => void;
  isEditing?: boolean;
  onRemove?: () => void;
  isSelected?: boolean;
  isNewlyAdded?: boolean; // For green flash animation
}

export default function VibePill({ 
  vibe, 
  index, 
  onClick, 
  isEditing = false, 
  onRemove,
  isSelected = false,
  isNewlyAdded = false
}: VibePillProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-1000 ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isNewlyAdded 
          ? 'bg-green-200 text-[#332B42] border-green-300 shadow-md' // More prominent green flash
          : isSelected 
          ? 'bg-[#A85C36] text-white border-[#A85C36]' 
          : 'bg-white text-[#332B42] border-[#332B42] hover:border-[#A85C36] hover:bg-[#F3F2F0]'
      } ${
        isEditing ? 'hover:border-red-300 hover:bg-red-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span>{vibe}</span>
        {isEditing && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 p-1 rounded-full hover:bg-red-100 transition-colors"
          >
            <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}
