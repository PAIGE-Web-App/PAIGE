'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCustomToast } from '@/hooks/useCustomToast';
import AIGenerationLoading from './AIGenerationLoading';
import VendorSwipeInterface from './VendorSwipeInterface';
import ReviewFlow from './ReviewFlow';

interface EnhancedOnboardingProps {
  userName: string;
  partnerName: string;
  weddingDate: string | null;
  weddingLocation: string;
  selectedVenueMetadata: any | null;
  maxBudget: number;
  guestCount: number;
  vibe: string[];
  onComplete: () => void;
  onBack: () => void;
}

type OnboardingStep = 'generating' | 'swiping' | 'review' | 'complete';

const EnhancedOnboarding: React.FC<EnhancedOnboardingProps> = ({
  userName,
  partnerName,
  weddingDate,
  weddingLocation,
  selectedVenueMetadata,
  maxBudget,
  guestCount,
  vibe,
  onComplete,
  onBack
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('generating');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [likedVendors, setLikedVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const router = useRouter();


  const handleGenerationComplete = (data: any) => {
    setGeneratedData(data);
    setCurrentStep('swiping');
    setIsLoading(false);
    showSuccessToast('Your wedding plan has been generated!');
  };

  const handleGenerationError = (error: string) => {
    showErrorToast(error);
    setIsLoading(false);
    // Stay on generating step to allow retry
  };

  const handleVendorSwipingComplete = (vendors: any[]) => {
    setLikedVendors(vendors);
    setCurrentStep('review');
  };

  const handleReviewComplete = async () => {
    try {
      // Save all the generated data to the user's account
      await saveGeneratedData({
        todos: generatedData.todos,
        budget: generatedData.budget,
        likedVendors: likedVendors,
        additionalContext: additionalContext
      });
      
      showSuccessToast('Your personalized wedding plan has been saved!');
      setCurrentStep('complete');
      
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      showErrorToast('Failed to save your plan. Please try again.');
    }
  };

  const saveGeneratedData = async (data: any) => {
    // This would call your actual API endpoint to save the data
    // For now, we'll simulate the API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Saving generated data:', data);
        resolve(true);
      }, 1000);
    });
  };

  const handleEdit = (section: 'todos' | 'budget' | 'vendors') => {
    // Handle editing of specific sections
    showSuccessToast(`Editing ${section}...`);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'generating': return 'Paige is creating your plan';
      case 'swiping': return 'Swipe through vendors';
      case 'review': return 'Review your plan';
      case 'complete': return 'Welcome to your personalized wedding hub!';
      default: return 'Enhanced Onboarding';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'generating': return 'This will take just a moment';
      case 'swiping': return 'Find vendors you love';
      case 'review': return 'Make sure everything looks perfect';
      case 'complete': return 'Your personalized wedding plan is ready!';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-linen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-playfair font-semibold text-[#332B42] mb-4">
            {getStepTitle()}
          </h1>
          {getStepDescription() && (
            <p className="text-[#364257] text-lg">
              {getStepDescription()}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#AB9C95] p-8">
          <AnimatePresence mode="wait">
            {currentStep === 'generating' && (
              <AIGenerationLoading
                userName={userName}
                partnerName={partnerName}
                onComplete={handleGenerationComplete}
                onError={handleGenerationError}
              />
            )}

            {currentStep === 'swiping' && generatedData && (
              <VendorSwipeInterface
                vendors={generatedData.vendors.venues.concat(generatedData.vendors.photographers)}
                onComplete={handleVendorSwipingComplete}
                onBack={() => setCurrentStep('generating')}
              />
            )}

            {currentStep === 'review' && generatedData && (
              <ReviewFlow
                todos={generatedData.todos}
                budget={generatedData.budget}
                likedVendors={likedVendors}
                onComplete={handleReviewComplete}
                onBack={() => setCurrentStep('swiping')}
                onEdit={handleEdit}
              />
            )}

            {currentStep === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center"
                >
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                
                <h2 className="text-3xl font-playfair font-semibold text-[#332B42] mb-4">
                  All set! 🎉
                </h2>
                
                <p className="text-[#364257] text-lg mb-8">
                  Your personalized wedding plan has been created and saved. 
                  You can now access your todos, budget, and vendor recommendations from your dashboard.
                </p>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-sm text-[#364257]"
                >
                  Redirecting to your dashboard...
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Indicator */}
        {currentStep !== 'complete' && (
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              {['generating', 'swiping', 'review'].map((step, index) => {
                const stepNames = ['generating', 'swiping', 'review'];
                const currentIndex = stepNames.indexOf(currentStep);
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                
                return (
                  <div
                    key={step}
                    className={`h-2 w-8 rounded-full transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-green-500' 
                        : isCurrent 
                          ? 'bg-[#A85C36]' 
                          : 'bg-[#E0D6D0]'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedOnboarding;
