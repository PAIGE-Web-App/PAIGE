/**
 * Paige Floating Button
 * Collapsed/minimized state of the Paige assistant
 * Shows a sparkle icon with optional badge count
 */

"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface PaigeFloatingButtonProps {
  suggestionCount: number;
  onClick: () => void;
  className?: string;
}

const PaigeFloatingButton: React.FC<PaigeFloatingButtonProps> = React.memo(({
  suggestionCount,
  onClick,
  className = ""
}) => {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`fixed bottom-12 right-12 z-30 ${className}`}
    >
      <button
        onClick={onClick}
        className="relative w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group"
        aria-label="Open Paige Assistant"
      >
        <Sparkles className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
        
        {/* Badge count for suggestions */}
        {suggestionCount > 0 && (
          <div 
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-sm"
            aria-label={`${suggestionCount} suggestions available`}
          >
            {suggestionCount > 9 ? '9+' : suggestionCount}
          </div>
        )}
      </button>
    </motion.div>
  );
});

PaigeFloatingButton.displayName = 'PaigeFloatingButton';

export default PaigeFloatingButton;

