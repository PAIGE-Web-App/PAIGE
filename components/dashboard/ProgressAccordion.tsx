import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ProgressItem } from '@/types/seatingChart';
import ProgressAccordionSkeleton from '../skeletons/ProgressAccordionSkeleton';

interface ProgressAccordionProps {
  progressItems: ProgressItem[];
  expandedItems: Set<string>;
  jiggleFields: Set<string>;
  onToggleAccordion: (itemId: string) => void;
  onProgressItemClick: (item: ProgressItem) => void;
  progressLoading: boolean;
}

export default function ProgressAccordion({
  progressItems,
  expandedItems,
  jiggleFields,
  onToggleAccordion,
  onProgressItemClick,
  progressLoading
}: ProgressAccordionProps) {
  if (progressLoading) {
    return <ProgressAccordionSkeleton />;
  }

  const weddingRelatedItems = progressItems.filter(item => 
    ['wedding-date', 'wedding-destination', 'venue', 'vibes', 'contacts', 'budget', 'todos', 'moodboard', 'seating-chart', 'files'].includes(item.id)
  );

  const generalFunctionItems = progressItems.filter(item => 
    ['paige-ai', 'credits'].includes(item.id)
  );

  const renderAccordionItem = (item: ProgressItem, index: number) => {
    const isExpanded = expandedItems.has(item.id);
    const isJiggling = jiggleFields.has(item.jiggleField || '');

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className={`bg-white rounded-lg border transition-all duration-200 ${
          item.completed 
            ? 'border-green-200 bg-green-50' 
            : 'border-[#E0DBD7] hover:border-[#A85C36]'
        } ${isJiggling ? 'animate-jiggle' : ''}`}
      >
        {/* Accordion Header */}
        <button
          onClick={() => onToggleAccordion(item.id)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 text-left">
            <div className={`p-2 rounded-lg ${
              item.completed 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {item.completed ? <CheckCircle className="w-5 h-5" /> : item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h6 className={`font-work font-medium text-sm ${
                item.completed ? 'text-green-800' : 'text-[#332B42]'
              }`}>
                {item.title}
              </h6>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              item.completed 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {item.completed ? 'Complete' : 'Pending'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </button>

        {/* Accordion Content */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 border-t border-gray-100"
          >
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-[#5A4A42] font-work flex-1">
                  {item.description}
                </p>
                <button
                  onClick={() => onProgressItemClick(item)}
                  className="btn-primary flex-shrink-0"
                >
                  {item.actionText}
                </button>
              </div>

              {/* Paige AI encouragement for specific items */}
              {(item.id === 'todos' || item.id === 'moodboard' || item.id === 'seating-chart') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700 font-work">
                    💡 <strong>Feeling overwhelmed?</strong> Let Paige create personalized resources for you! 
                    Use the AI features to generate custom todo lists, moodboards, or seating arrangements.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Wedding Related Section */}
      <div>
        <h6 className="text-[#332B42] mb-4">Wedding Related</h6>
        <div className="space-y-3">
          {weddingRelatedItems.map((item, index) => renderAccordionItem(item, index))}
        </div>
      </div>

      {/* General Functions Section */}
      <div>
        <h6 className="text-[#332B42] mb-4">General Functions</h6>
        <div className="space-y-3">
          {generalFunctionItems.map((item, index) => renderAccordionItem(item, index))}
        </div>
      </div>
    </div>
  );
}
