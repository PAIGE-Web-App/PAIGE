import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Sparkles, Gift } from 'lucide-react';

interface ContinuousImprovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  categories: string[];
  promptType: string;
  onCreditsAwarded?: (credits: number) => void;
}

const ContinuousImprovementModal: React.FC<ContinuousImprovementModalProps> = ({
  isOpen,
  onClose,
  userId,
  categories,
  promptType,
  onCreditsAwarded
}) => {
  // Don't render anything if modal is not open
  if (!isOpen) {
    return null;
  }
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [creditsAwarded, setCreditsAwarded] = useState(0);

  const handleSubmit = async () => {
    if (!rating) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/track-todo-satisfaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          satisfaction: rating,
          categories,
          feedback: feedback.trim() || undefined,
          promptType,
          awardCredits: true // Flag to award credits
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const credits = calculateCredits(rating, feedback.trim());
        setCreditsAwarded(credits);
        setIsSubmitted(true);
        onCreditsAwarded?.(credits);
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateCredits = (rating: number, feedback: string): number => {
    if (feedback.trim().length > 0) {
      return 3; // 3 credits for detailed feedback
    }
    return 1; // 1 credit for just rating
  };

  const getCreditMessage = () => {
    if (feedback.trim().length > 0) {
      return "Thanks for the detailed feedback! You've earned 3 bonus credits! 🎉";
    }
    return "Thanks for rating! You've earned 1 bonus credit! ⭐";
  };

  if (isSubmitted) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
            onClick={onClose}
          >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <h5 className="h5 text-center flex-1 text-green-600">Thank You!</h5>
              <button
                onClick={onClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full flex-1 flex justify-end"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Success Content */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 rounded-full p-4">
                  <Gift className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {getCreditMessage()}
              </p>
              <p className="text-xs text-gray-500">
                Your feedback helps us make Paige even better for your wedding planning!
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full btn-primary"
            >
              Continue Planning
            </button>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 rounded-full p-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <h5 className="h5 text-left">Help Make Paige Better!</h5>
            </div>
            <button
              onClick={onClose}
              className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 text-center mb-3">
              Rate your AI-generated todos and earn bonus credits!
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-700 text-center">
                <strong>⭐ Rate only:</strong> 1 bonus credit<br/>
                <strong>💬 Rate + feedback:</strong> 3 bonus credits
              </p>
            </div>
          </div>

          {/* Star Rating */}
          <div className="mb-6">
            <h6 className="text-sm font-medium text-gray-900 mb-3 text-center">
              How good were the To-dos that Paige created?
            </h6>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`transition-colors ${
                    rating && star <= rating
                      ? 'text-yellow-400 hover:text-yellow-500'
                      : 'text-gray-300 hover:text-yellow-400'
                  }`}
                  disabled={isSubmitting}
                >
                  <Star className="w-8 h-8 fill-current" />
                </button>
              ))}
            </div>
            {rating && (
              <p className="text-xs text-gray-600 text-center mt-2">
                {rating === 1 ? 'Poor' : 
                 rating === 2 ? 'Fair' : 
                 rating === 3 ? 'Good' : 
                 rating === 4 ? 'Very Good' : 'Excellent'}
              </p>
            )}
          </div>

          {/* Optional Feedback */}
          <div className="mb-6">
            <h6 className="text-sm font-medium text-gray-900 mb-2">
              Optional: What could we improve?
            </h6>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g., 'More budget-friendly options', 'Earlier deadlines', 'Better vendor suggestions'"
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Detailed feedback earns 3 bonus credits instead of 1!
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!rating || isSubmitting}
            className={`w-full py-3 px-4 rounded transition-colors ${
              rating && !isSubmitting
                ? 'btn-primary'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Submitting...' : `Submit & Earn ${calculateCredits(rating || 0, feedback)} Credits`}
          </button>

          {/* Skip Option */}
          <button
            onClick={onClose}
            className="w-full text-xs text-gray-500 hover:text-gray-700 mt-3 py-2"
            disabled={isSubmitting}
          >
            Skip for now
          </button>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContinuousImprovementModal;
