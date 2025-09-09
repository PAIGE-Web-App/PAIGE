import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';

interface BudgetCreationProgressProps {
  isVisible: boolean;
  current: number;
  total: number;
  currentItem: string;
}

const BudgetCreationProgress: React.FC<BudgetCreationProgressProps> = ({
  isVisible,
  current,
  total,
  currentItem,
}) => {
  if (!isVisible) return null;

  const progress = total > 0 ? (current / total) * 100 : 0;
  const isComplete = current >= total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6"
      >
        <div className="text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#F8F6F4] rounded-full flex items-center justify-center">
              {isComplete ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <Loader2 className="w-8 h-8 text-[#A85C36] animate-spin" />
              )}
            </div>
          </div>

          {/* Title */}
          <h5 className="h5 mb-2">
            {isComplete ? 'Budget Created!' : 'Creating Budget...'}
          </h5>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-[#A85C36] h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{current} of {total} items</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Current Item */}
          <p className="text-sm text-gray-600 mb-2">
            {isComplete ? 'All budget items have been created successfully!' : currentItem}
          </p>

          {/* Status */}
          <div className="text-xs text-gray-500">
            {isComplete ? 'You can now start adding expenses to your budget items.' : 'Please wait while we create your budget...'}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BudgetCreationProgress;
