import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, FileText, DollarSign, MessageSquare, Image } from 'lucide-react';

interface AILoadingIndicatorProps {
  operation: 'file-analysis' | 'budget-generation' | 'message-analysis' | 'todo-generation' | 'moodboard-generation' | 'general';
  progress?: number;
  message?: string;
  showProgress?: boolean;
}

const operationConfig = {
  'file-analysis': {
    icon: FileText,
    title: 'Analyzing Document',
    messages: [
      'Reading your document...',
      'Extracting key information...',
      'Identifying important dates and terms...',
      'Generating insights...',
      'Almost done!'
    ]
  },
  'budget-generation': {
    icon: DollarSign,
    title: 'Creating Budget',
    messages: [
      'Analyzing your requirements...',
      'Researching wedding costs...',
      'Calculating allocations...',
      'Optimizing recommendations...',
      'Finalizing budget breakdown...'
    ]
  },
  'message-analysis': {
    icon: MessageSquare,
    title: 'Analyzing Message',
    messages: [
      'Reading message content...',
      'Extracting actionable items...',
      'Identifying priorities...',
      'Generating recommendations...',
      'Preparing response...'
    ]
  },
  'todo-generation': {
    icon: Brain,
    title: 'Creating To-Do List',
    messages: [
      'Understanding your needs...',
      'Planning timeline...',
      'Prioritizing tasks...',
      'Adding deadlines...',
      'Finalizing checklist...'
    ]
  },
  'moodboard-generation': {
    icon: Image,
    title: 'Generating Mood Board',
    messages: [
      'Analyzing your images...',
      'Extracting color palettes...',
      'Finding similar styles...',
      'Creating mood board...',
      'Adding final touches...'
    ]
  },
  'general': {
    icon: Sparkles,
    title: 'AI Processing',
    messages: [
      'Processing your request...',
      'Analyzing data...',
      'Generating response...',
      'Almost ready...'
    ]
  }
};

export default function AILoadingIndicator({ 
  operation, 
  progress = 0, 
  message, 
  showProgress = true 
}: AILoadingIndicatorProps) {
  const config = operationConfig[operation];
  const Icon = config.icon;
  
  // Calculate which message to show based on progress
  const messageIndex = Math.min(
    Math.floor((progress / 100) * config.messages.length),
    config.messages.length - 1
  );
  const currentMessage = message || config.messages[messageIndex];

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-sm border">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mb-6"
      >
        {/* Animated icon */}
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center"
        >
          <Icon className="w-8 h-8 text-white" />
        </motion.div>
        
        {/* Pulsing ring */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 border-2 border-purple-300 rounded-full"
        />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-gray-800 mb-2"
      >
        {config.title}
      </motion.h3>

      {/* Message */}
      <motion.p
        key={currentMessage}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.3 }}
        className="text-sm text-gray-600 text-center mb-4 max-w-sm"
      >
        {currentMessage}
      </motion.p>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Animated dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex space-x-1 mt-4"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
            className="w-2 h-2 bg-purple-400 rounded-full"
          />
        ))}
      </motion.div>
    </div>
  );
}
