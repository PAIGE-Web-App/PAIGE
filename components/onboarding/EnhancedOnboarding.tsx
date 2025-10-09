'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, Sparkles } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import VendorSwipeInterface from './VendorSwipeInterface';
import ReviewFlow from './ReviewFlow';

interface EnhancedOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  generatedData: any;
  userId: string;
}

type OnboardingStep = 'swiping' | 'review' | 'complete';

const EnhancedOnboarding: React.FC<EnhancedOnboardingProps> = ({
  isOpen,
  onClose,
  onComplete,
  generatedData,
  userId
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('swiping');
  const [likedVendors, setLikedVendors] = useState<any[]>([]);
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const router = useRouter();

  // Debug logging
  // Enhanced onboarding initialized

  if (!isOpen) return null;

  const handleVendorSwipeComplete = (vendors: any[]) => {
    setLikedVendors(vendors);
    setCurrentStep('review');
  };

  const handleReviewComplete = async () => {
    try {
      // Save liked vendors to user's favorites
      if (likedVendors.length > 0) {
        await saveLikedVendors(likedVendors);
      }
      
      showSuccessToast('Your personalized wedding plan has been saved!');
      setCurrentStep('complete');
      
      // Complete the onboarding after a brief delay
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      showErrorToast('Failed to save your plan. Please try again.');
    }
  };

  const saveLikedVendors = async (vendors: any[]) => {
    try {
      const response = await fetch('/api/user-favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          vendors: vendors.map(vendor => ({
            placeId: vendor.id,
            name: vendor.name,
            category: vendor.category,
            rating: vendor.rating,
            vicinity: vendor.vicinity,
            price: vendor.price,
            description: vendor.description
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save vendors');
      }
    } catch (error) {
      console.error('Error saving liked vendors:', error);
      throw error;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'swiping': return 'Discover Your Perfect Vendors';
      case 'review': return 'Review Your Wedding Plan';
      case 'complete': return 'Welcome to Your Wedding Hub!';
      default: return 'Enhanced Onboarding';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'swiping': return 'Click on vendors you love to save them as favorites!';
      case 'review': return 'Take a look at your personalized to-do list and budget breakdown.';
      case 'complete': return 'Your wedding planning journey starts now!';
      default: return '';
    }
  };

  return (
    <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white w-full h-full p-6 relative flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header row with title and close button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h5 className="h5">{getStepTitle()}</h5>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 text-left">{getStepDescription()}</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {currentStep === 'swiping' && (
                <motion.div
                  key="swiping"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="h-full"
                >
                <VendorSwipeInterface
                  vendors={generatedData?.vendors || {}}
                  onComplete={handleVendorSwipeComplete}
                  onSkip={() => {
                    setLikedVendors([]);
                    setCurrentStep('review');
                  }}
                />
              </motion.div>
            )}

            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="h-full"
              >
                <ReviewFlow
                  todos={generatedData?.todos || []}
                  budget={generatedData?.budget || {}}
                  likedVendors={likedVendors}
                  onComplete={handleReviewComplete}
                  onBack={() => setCurrentStep('swiping')}
                />
              </motion.div>
            )}

            {currentStep === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h6 className="font-medium text-[#332B42] mb-3">All Set! 🎉</h6>
                  <p className="text-sm text-gray-600 text-left">
                    Your personalized wedding plan has been created and saved. 
                    You can now start planning your perfect day!
                  </p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={onComplete}
                    className="btn-primary px-6 py-2 text-sm"
                  >
                    Start Planning
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedOnboarding;