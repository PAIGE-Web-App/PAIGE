import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, DollarSign, Calculator, Sparkles } from 'lucide-react';

interface BudgetGenerationProgressProps {
  isVisible: boolean;
  current: number;
  total: number;
  currentItem: string;
}

const BudgetGenerationProgress: React.FC<BudgetGenerationProgressProps> = ({
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
                <Sparkles className="w-8 h-8 text-purple-600" />
              )}
            </div>
          </div>

          {/* Title */}
          <h5 className="h5 mb-2">
            {isComplete ? 'Budget Generated!' : 'Generating AI Budget...'}
          </h5>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-purple-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{current} of {total} categories</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Current Item */}
          <p className="text-sm text-gray-600 mb-2">
            {isComplete ? 'All budget categories have been created successfully!' : currentItem}
          </p>

          {/* Status Icons */}
          <div className="flex justify-center space-x-4 mt-4">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <DollarSign className="w-4 h-4" />
              <span>Analyzing budget</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Calculator className="w-4 h-4" />
              <span>Calculating amounts</span>
            </div>
          </div>

          {/* Completion Message */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200"
            >
              <p className="text-sm text-green-800 font-medium">
                Your personalized budget is ready to use!
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BudgetGenerationProgress;
