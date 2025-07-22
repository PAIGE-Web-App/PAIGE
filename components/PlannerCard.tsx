import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';

interface PlannerCardProps {
  planner: {
    name: string;
    formatted_address: string;
    rating?: number;
    user_ratings_total?: number;
    url?: string;
  };
  onDelete?: () => void;
  showDeleteButton?: boolean;
}

export default function PlannerCard({ planner, onDelete, showDeleteButton = true }: PlannerCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="mb-4 p-4 bg-white rounded-lg border border-[#AB9C95] overflow-hidden"
    >
      <motion.div layout="position">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-playfair text-[#332B42]">{planner.name}</h4>
          {showDeleteButton && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[#364257] hover:text-[#A85C36] transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-4 items-start">
          {/* Temporarily removed image/icon section - matching VenueCard structure */}
          <div className="flex-1">
            <p className="text-sm text-[#364257] mb-1">{planner.formatted_address}</p>
            {planner.rating && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">★</span>
                <span className="font-medium">{planner.rating}</span>
                {planner.user_ratings_total && (
                  <span className="text-xs text-[#364257]">({planner.user_ratings_total} Google reviews)</span>
                )}
              </div>
            )}
            {planner.url && (
              <a
                href={planner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:opacity-80"
              >
                View on Google Maps
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 