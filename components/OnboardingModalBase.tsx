import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Stepper from './Stepper';

interface OnboardingModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  steps: { id: number; name: string }[];
  currentStep: number;
  onStepChange?: (step: number) => void;
  children: React.ReactNode;
  sidebarTitle?: string;
  footer?: React.ReactNode;
}

const OnboardingModalBase: React.FC<OnboardingModalBaseProps> = ({
  isOpen,
  onClose,
  steps,
  currentStep,
  onStepChange,
  children,
  sidebarTitle = 'Set up your unified inbox',
  footer,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex bg-black bg-opacity-40 overflow-hidden justify-center items-end md:items-center"
        >
          <motion.div
            initial={{ y: "100vh", x: "-50%", left: "50%" }}
            animate={{ y: 0, x: "-50%", left: "50%" }}
            exit={{ y: "100vh", x: "-50%", left: "50%" }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
            className="relative w-full h-[95vh] rounded-t-[15px] bg-[#F3F2F0] flex overflow-hidden md:h-full md:rounded-[15px] md:top-auto md:left-auto md:transform-none"
          >
            <div className="flex flex-1 h-full flex-col md:flex-row">
              {/* Left Sidebar (Steps) */}
              <div className="w-full md:w-[300px] bg-white p-8 border-b md:border-r border-[#AB9C95] flex flex-col justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-playfair font-semibold text-[#332B42] mb-8">{sidebarTitle}</h2>
                  <Stepper steps={steps} currentStep={currentStep} onStepChange={onStepChange} />
                </div>
              </div>
              {/* Right Content Area */}
              <div className="flex-1 flex flex-col h-full bg-[#F3F2F0] relative">
                {/* Fixed Header */}
                <div className="fixed top-0 right-0 left-[300px] md:left-[300px] bg-[#F3F2F0] border-b border-[#AB9C95] z-50 flex items-center justify-between px-8" style={{paddingTop: '1rem', paddingBottom: '1rem'}}>
                  <h2 className="text-xl font-playfair font-semibold text-[#332B42]">{sidebarTitle}</h2>
                  <button
                    onClick={onClose}
                    className="text-[#332B42] hover:text-[#A85C36] p-2 rounded-full"
                    aria-label="Close"
                  >
                    <X size={24} />
                  </button>
                </div>
                {/* Scrollable Content */}
                <div className="flex-1 flex flex-col h-full overflow-y-auto px-0 pb-32 pt-24">{children}</div>
                {/* Fixed Footer */}
                {footer && (
                  <div className="fixed bottom-0 right-0 left-[300px] md:left-[300px] bg-[#F3F2F0] border-t border-[#AB9C95] z-40 flex justify-end px-8" style={{paddingTop: '1rem', paddingBottom: '1rem'}}>
                    {footer}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModalBase; 