"use client";

import React, { useState } from 'react';
import { Sparkles, X, Clock, Users, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaigeInlineSuggestionProps {
  todoName: string;
  todoCategory?: string;
  daysUntilWedding?: number;
  onAccept?: (suggestion: string) => void;
  onDismiss?: () => void;
}

export default function PaigeInlineSuggestion({
  todoName,
  todoCategory,
  daysUntilWedding,
  onAccept,
  onDismiss
}: PaigeInlineSuggestionProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Generate smart suggestions based on todo content
  const generateSuggestion = () => {
    const name = todoName.toLowerCase();
    
    // Venue-related suggestions
    if (name.includes('venue') || name.includes('location')) {
      if (daysUntilWedding && daysUntilWedding < 365) {
        return {
          icon: <MapPin className="w-3 h-3" />,
          text: "Consider booking ASAP - popular venues fill up quickly!",
          type: "urgent" as const
        };
      }
      return {
        icon: <MapPin className="w-3 h-3" />,
        text: "Tip: Visit venues on different days/times to see how they feel",
        type: "tip" as const
      };
    }

    // Photography suggestions
    if (name.includes('photographer') || name.includes('photo')) {
      return {
        icon: <Users className="w-3 h-3" />,
        text: "Ask to see full wedding galleries, not just highlight reels",
        type: "tip" as const
      };
    }

    // Catering suggestions
    if (name.includes('catering') || name.includes('food') || name.includes('menu')) {
      return {
        icon: <Users className="w-3 h-3" />,
        text: "Schedule tastings for different times of day to match your reception",
        type: "tip" as const
      };
    }

    // Timeline suggestions
    if (name.includes('timeline') || name.includes('schedule')) {
      return {
        icon: <Clock className="w-3 h-3" />,
        text: "Build in 15-minute buffers between major events",
        type: "tip" as const
      };
    }

    // Guest list suggestions
    if (name.includes('guest') || name.includes('invite')) {
      return {
        icon: <Users className="w-3 h-3" />,
        text: "Send save-the-dates 6-8 months before your wedding",
        type: "tip" as const
      };
    }

    // Default suggestion based on timing
    if (daysUntilWedding) {
      if (daysUntilWedding < 30) {
        return {
          icon: <Clock className="w-3 h-3" />,
          text: "Final month focus: Confirm details and create day-of timeline",
          type: "urgent" as const
        };
      } else if (daysUntilWedding < 90) {
        return {
          icon: <Clock className="w-3 h-3" />,
          text: "3-month mark: Time to finalize vendor details and guest count",
          type: "reminder" as const
        };
      }
    }

    return null;
  };

  const suggestion = generateSuggestion();

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleAccept = () => {
    if (suggestion) {
      onAccept?.(suggestion.text);
    }
    setIsVisible(false);
  };

  if (!suggestion || !isVisible) {
    return null;
  }

  const bgColor = suggestion.type === 'urgent' ? 'bg-red-50 border-red-200' : 
                  suggestion.type === 'reminder' ? 'bg-orange-50 border-orange-200' :
                  'bg-purple-50 border-purple-200';

  const textColor = suggestion.type === 'urgent' ? 'text-red-700' : 
                    suggestion.type === 'reminder' ? 'text-orange-700' :
                    'text-purple-700';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`mt-2 p-2 rounded-md border ${bgColor} ${textColor}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2 flex-1">
            <div className="flex items-center space-x-1 mt-0.5">
              <Sparkles className="w-3 h-3" />
              {suggestion.icon}
            </div>
            <p className="text-xs leading-relaxed">
              <span className="font-medium">Paige suggests:</span> {suggestion.text}
            </p>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={handleAccept}
              className="text-xs px-2 py-1 bg-white/50 hover:bg-white/80 rounded transition-colors"
              title="Helpful"
            >
              ✓
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/50 rounded transition-colors"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
