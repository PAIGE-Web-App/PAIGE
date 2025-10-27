/**
 * Paige Insight Card
 * Displays a single insight with icon, title, description, action, and dismiss button
 */

"use client";

import React from 'react';
import { Lightbulb, CheckCircle, AlertTriangle, Clock, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { PaigeInsight, PaigeInsightType } from '@/types/paige';

interface PaigeInsightCardProps {
  insight: PaigeInsight;
  index?: number; // For staggered animation
  onDismiss: (insightId: string) => void;
}

// Memoized icon component
const InsightIcon: React.FC<{ type: PaigeInsightType }> = React.memo(({ type }) => {
  switch (type) {
    case 'urgent': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'tip': return <Lightbulb className="w-4 h-4 text-blue-500" />;
    case 'suggestion': return <Sparkles className="w-4 h-4 text-purple-500" />;
    case 'celebration': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'reminder': return <Clock className="w-4 h-4 text-orange-500" />;
    default: return <Lightbulb className="w-4 h-4 text-gray-500" />;
  }
});
InsightIcon.displayName = 'InsightIcon';

const PaigeInsightCard: React.FC<PaigeInsightCardProps> = React.memo(({
  insight,
  index = 0,
  onDismiss
}) => {
  return (
    <motion.div
      key={insight.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="flex items-start space-x-2">
        <InsightIcon type={insight.type} />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium text-gray-800 mb-1 font-work">
            {insight.title}
          </h4>
          <p className="text-xs text-gray-600 mb-2 font-work">
            {insight.description}
          </p>
          {insight.action && (
            <button
              onClick={insight.action.onClick}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium hover:underline"
              aria-label={insight.action.label}
            >
              {insight.action.label}
            </button>
          )}
        </div>
        {insight.dismissible && (
          <button
            onClick={() => onDismiss(insight.id)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Dismiss insight"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

PaigeInsightCard.displayName = 'PaigeInsightCard';

export default PaigeInsightCard;

