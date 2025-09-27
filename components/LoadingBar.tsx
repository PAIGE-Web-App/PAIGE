import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface LoadingBarProps {
  description: string;
  isVisible: boolean;
  onComplete?: () => void;
}

const LoadingBar: React.FC<LoadingBarProps> = ({ description, isVisible, onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible && progress > 0) {
      setProgress(100);
      const timer = setTimeout(() => {
        setProgress(0);
        onComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, progress, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 w-[300px] z-50"
        >
          <div className="w-full h-2 bg-[#EBE3DD] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-600"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <div className="text-sm text-[#332B42] mt-2 flex items-center gap-2 text-left">
            <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <div>
              {description.split('\n').map((line, index) => (
                <p key={index} className={index === 1 ? 'text-xs mt-1' : ''}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingBar; 