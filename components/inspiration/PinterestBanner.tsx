import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';

interface PinterestBannerProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function PinterestBanner({ isExpanded, onToggle }: PinterestBannerProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-2 rounded-lg shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center gap-2 text-xs font-semibold"
      >
        <Star className="w-4 h-4" strokeWidth={1} />
        <span>Pinterest Integration</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Overlay Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 w-80 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-[5px] shadow-xl z-10 border border-purple-500"
          >
            <div className="p-4">
              <h5 className="font-semibold text-sm text-white mb-2">Coming Soon: Pinterest Integration!</h5>
              <p className="text-sm opacity-90 text-white leading-relaxed">
                Search Pinterest, import your boards, and get AI-powered vibe suggestions from your favorite wedding inspiration.
              </p>
            </div>
            {/* Arrow pointing up */}
            <div className="absolute -top-2 right-6 w-4 h-4 bg-purple-600 transform rotate-45 border-l border-t border-purple-500"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
