'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, Users, ClipboardList, DollarSign, Layout, Palette, Sparkles, Calendar, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  firstName?: string;
  showCloseButton?: boolean;
}

export default function WelcomeModal({ isOpen, onClose, firstName, showCloseButton = false }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <div className="mb-6">
              <div className="mb-6">
                <img 
                  src="/first.png" 
                  alt="Welcome to Paige" 
                  className="mx-auto max-w-32 h-auto"
                />
              </div>
              <h2 className="text-xl font-medium text-[#332B42] mb-4">
                Welcome aboard, {firstName || 'there'}!
              </h2>
              <div className="text-left">
                <p className="text-[#5A4A42] text-sm leading-relaxed">
                  Wedding planning isn't easy for <strong>anyone</strong>. It can be an extremely stressful time of juggling timelines, communication with vendors, budgets, and much more.
                </p>
                <p className="text-[#5A4A42] text-sm leading-relaxed mt-4">
                  That's where Paige comes in - and it's the reason why we're here in the first place.
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <div className="mb-6">
              <img 
                src="/two.png" 
                alt="Wedding Planning Factors" 
                className="mx-auto max-w-32 h-auto"
              />
            </div>
            <h2 className="text-xl font-medium text-[#332B42] mb-6">
              When it comes to the big day, there are SO many things you have to think about:
            </h2>
            <div className="text-left">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 text-[#A85C36] flex-shrink-0" />
                  <span className="text-[#5A4A42] text-sm"><strong>Vendors:</strong> Selection, Communication, Management, etc.</span>
                </div>
                <div className="flex items-center space-x-3">
                  <ClipboardList className="w-4 h-4 text-[#A85C36] flex-shrink-0" />
                  <span className="text-[#5A4A42] text-sm"><strong>To-dos:</strong> Knowing what to do when according to your wedding date</span>
                </div>
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-4 h-4 text-[#A85C36] flex-shrink-0" />
                  <span className="text-[#5A4A42] text-sm"><strong>Budgets:</strong> Setting realistic budgets for your wedding that you can actually manage</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Layout className="w-4 h-4 text-[#A85C36] flex-shrink-0" />
                  <span className="text-[#5A4A42] text-sm"><strong>Seating Charts:</strong> Creating the optimal layout for your guests</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Palette className="w-4 h-4 text-[#A85C36] flex-shrink-0" />
                  <span className="text-[#5A4A42] text-sm"><strong>Moodboards:</strong> Setting the vibe for your big day</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <div className="mb-6">
              <img 
                src="/tech.png" 
                alt="Paige AI Technology" 
                className="mx-auto max-w-32 h-auto"
              />
            </div>
            <h2 className="text-xl font-medium text-[#332B42] mb-6">
              Don't worry! Paige is here to help.
            </h2>
            <div className="text-left">
              <div className="space-y-4">
                <p className="text-[#5A4A42] text-sm leading-relaxed">
                  Paige is your all-in-one wedding planning partner.
                </p>
                <p className="text-[#5A4A42] text-sm leading-relaxed">
                  It takes the details that matter most: your venue, wedding date, and vibe and uses them to draft personalized outreach to your vendors.
                </p>
                <p className="text-[#5A4A42] text-sm leading-relaxed">
                  With Paige, you'll get smart budgets built around your max spend and custom to-do lists that match your wedding timeline so that you stay organized without being overwhelmed.
                </p>
                <p className="text-[#5A4A42] text-sm leading-relaxed">
                  And when you connect your Gmail, Paige automatically keeps tabs on vendor replies, suggesting new tasks or updates to your list as plans evolve.
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center">
            <div className="mb-6">
              <img 
                src="/four.png" 
                alt="Get Started with Paige" 
                className="mx-auto max-w-32 h-auto"
              />
            </div>
            <h2 className="text-xl font-medium text-[#332B42] mb-6">
              That's it! Let's get started.
            </h2>
            <div className="text-left">
              <p className="text-[#5A4A42] text-sm mb-8">
                Select one of the most common wedding planning items below to kick off your journey with Paige. You can always access this popup again on your dashboard!
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/vendors"
                onClick={handleClose}
                className="flex flex-col items-center p-4 border border-[#E0DBD7] rounded-lg hover:bg-[#F3F2F0] transition-colors no-underline"
              >
                <Users className="w-6 h-6 text-[#8B5CF6] mb-2" style={{ strokeWidth: 1.5 }} />
                <span className="font-medium text-[#332B42] text-sm">Explore Venues & Vendors</span>
              </Link>
              <Link
                href="/todo"
                onClick={handleClose}
                className="flex flex-col items-center p-4 border border-[#E0DBD7] rounded-lg hover:bg-[#F3F2F0] transition-colors no-underline"
              >
                <ClipboardList className="w-6 h-6 text-[#8B5CF6] mb-2" style={{ strokeWidth: 1.5 }} />
                <span className="font-medium text-[#332B42] text-sm">Create your first to-do list</span>
              </Link>
              <Link
                href="/budget"
                onClick={handleClose}
                className="flex flex-col items-center p-4 border border-[#E0DBD7] rounded-lg hover:bg-[#F3F2F0] transition-colors no-underline"
              >
                <DollarSign className="w-6 h-6 text-[#8B5CF6] mb-2" style={{ strokeWidth: 1.5 }} />
                <span className="font-medium text-[#332B42] text-sm">Create your budget plan</span>
              </Link>
            </div>
            <div className="mt-6">
              <button
                onClick={handleClose}
                className="text-[#A85C36] hover:text-[#8B4A2A] font-medium text-sm underline"
              >
                Take me to the Dashboard for now
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        >
                 <motion.div
                   initial={{ y: -50, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   exit={{ y: -50, opacity: 0 }}
                   className="bg-white rounded-[5px] shadow-xl max-w-lg w-full h-[70vh] md:h-[75vh] flex flex-col relative mx-2 md:mx-0"
                   onClick={(e) => e.stopPropagation()}
                 >
                   {/* Close Button - Only show when showCloseButton is true */}
                   {showCloseButton && (
                     <button
                       onClick={onClose}
                       className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
                     >
                       <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </button>
                   )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 modal-content-scrollable flex items-center justify-center">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full"
              >
                {renderStep()}
              </motion.div>
            </div>

            {/* Fixed Footer */}
            <div className="flex items-center justify-between p-4 md:p-6 border-t border-[#E0DBD7] flex-shrink-0">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="btn-primaryinverse flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex space-x-2">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i + 1 <= currentStep ? 'bg-[#A85C36]' : 'bg-[#E0DBD7]'
                    }`}
                  />
                ))}
              </div>

              {currentStep < totalSteps ? (
                <button
                  onClick={handleNext}
                  className="btn-primary flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleClose}
                  className="btn-primary flex items-center space-x-2"
                >
                  <span>Close</span>
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
