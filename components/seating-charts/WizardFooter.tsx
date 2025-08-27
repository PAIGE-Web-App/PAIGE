import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Sparkles } from 'lucide-react';
import { WizardStep } from './types';

interface WizardFooterProps {
  currentStep: WizardStep;
  canProceedToNext: boolean;
  canGoToPrevious: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  showAutoSave: boolean;
  isLoading: boolean;
}

export default function WizardFooter({
  currentStep,
  canProceedToNext,
  canGoToPrevious,
  onPrevious,
  onNext,
  onSaveDraft,
  showAutoSave,
  isLoading
}: WizardFooterProps) {
  const getStepTitle = () => {
    switch (currentStep) {
      case 'guests':
        return 'Guest Information';
      case 'tables':
        return 'Table Layout';
      case 'organization':
        return 'AI Organization';
      default:
        return 'Seating Chart Wizard';
    }
  };

  const getNextButtonText = () => {
    switch (currentStep) {
      case 'guests':
        return 'Next: Table Layout';
      case 'tables':
        return 'Next: AI Organization';
      case 'organization':
        return 'Create Chart';
      default:
        return 'Next';
    }
  };

  const isLastStep = currentStep === 'organization';

  return (
    <div className="fixed bottom-0 right-0 left-[300px] bg-[#F3F2F0] border-t border-[#AB9C95] z-40 flex justify-between items-center px-8" style={{paddingTop: '1rem', paddingBottom: '1rem'}}>
      {/* Left side - Auto-save indicator */}
      <div className="flex items-center">
        <AnimatePresence>
          {showAutoSave && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 text-sm text-[#7A7A7A]"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-saved</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right side - Navigation buttons */}
      <div className="flex gap-4">
        {/* Save Draft Button */}
        <button
          onClick={onSaveDraft}
          disabled={isLoading}
          className="btn-primaryinverse flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Draft
        </button>

        {/* Previous Button */}
        {canGoToPrevious && (
          <button
            onClick={onPrevious}
            disabled={isLoading}
            className="btn-primaryinverse flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
        )}

        {/* Next/Create Button */}
        <button
          onClick={onNext}
          disabled={!canProceedToNext || isLoading}
          className={`btn-primary flex items-center gap-2 ${
            !canProceedToNext ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLastStep ? (
            <>
              <Sparkles className="w-4 h-4" />
              Create Chart
            </>
          ) : (
            <>
              {getNextButtonText()}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
