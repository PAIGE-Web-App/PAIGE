import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ProgressItem } from '@/types/seatingChart';

interface ProgressAccordionItemProps {
  item: ProgressItem;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: () => void;
}

export default function ProgressAccordionItem({ 
  item, 
  isExpanded, 
  onToggle, 
  onClick 
}: ProgressAccordionItemProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              item.completed ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h6 className={`${
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
                onClick={onClick}
                className="btn-primary flex-shrink-0"
              >
                {item.actionText}
              </button>
            </div>

            {/* Paige AI encouragement for specific items */}
            {(item.id === 'todos' || item.id === 'moodboard' || item.id === 'seating-chart') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-work">
                  <strong>💡 Pro tip:</strong> Feeling overwhelmed? Let Paige AI help you create this! 
                  Our AI can generate personalized content based on your wedding details and preferences.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
