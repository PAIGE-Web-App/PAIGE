'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import VendorSwipeInterface from './VendorSwipeInterface';
import ReviewFlow from './ReviewFlow';

interface AIOnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userName: string;
  partnerName: string;
  weddingDate: string | null;
  weddingLocation: string;
  selectedVenueMetadata: any | null;
  maxBudget: number;
  guestCount: number;
  vibe: string[];
  additionalContext?: string;
}

type FlowStep = 'generating' | 'swiping' | 'review' | 'complete';

const AIOnboardingFlow: React.FC<AIOnboardingFlowProps> = ({
  isOpen,
  onClose,
  onComplete,
  userName,
  partnerName,
  weddingDate,
  weddingLocation,
  selectedVenueMetadata,
  maxBudget,
  guestCount,
  vibe,
  additionalContext = ''
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('generating');
  const [progress, setProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [likedVendors, setLikedVendors] = useState<any[]>([]);
  const { showSuccessToast, showErrorToast } = useCustomToast();

  const generationSteps = [
    'Analyzing your wedding details...',
    'Generating personalized to-do list...',
    'Creating budget breakdown...',
    'Finding local vendors...',
    'Finalizing your plan...'
  ];

  useEffect(() => {
    if (isOpen) {
      startGeneration();
    }
  }, [isOpen]);

  const startGeneration = async () => {
    setCurrentStep('generating');
    setProgress(0);
    
    // Simulate AI generation with progress updates
    for (let i = 0; i < generationSteps.length; i++) {
      setCurrentStepText(generationSteps[i]);
      setProgress((i + 1) * 20);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Complete generation
    setProgress(100);
    
    // Generate mock data (replace with actual API call)
    const mockData = {
      todos: [
        { id: '1', title: 'Book photographer', category: 'Photography', deadline: '2024-02-15', priority: 'High' },
        { id: '2', title: 'Choose wedding flowers', category: 'Florist', deadline: '2024-03-01', priority: 'Medium' },
        { id: '3', title: 'Finalize guest list', category: 'Planning', deadline: '2024-01-30', priority: 'High' }
      ],
      budget: {
        total: maxBudget,
        categories: [
          { name: 'Venue', amount: maxBudget * 0.4, percentage: 40 },
          { name: 'Photography', amount: maxBudget * 0.15, percentage: 15 },
          { name: 'Catering', amount: maxBudget * 0.25, percentage: 25 },
          { name: 'Flowers', amount: maxBudget * 0.1, percentage: 10 },
          { name: 'Music', amount: maxBudget * 0.1, percentage: 10 }
        ]
      },
      vendors: {
        venues: [
          { id: '1', name: 'Garden Venue', category: 'Venue', price: '$5,000', rating: 4.8, vicinity: 'Downtown' },
          { id: '2', name: 'Historic Mansion', category: 'Venue', price: '$8,000', rating: 4.9, vicinity: 'Historic District' }
        ],
        photographers: [
          { id: '3', name: 'Sarah Johnson Photography', category: 'Photography', price: '$2,500', rating: 4.9, vicinity: 'Downtown' },
          { id: '4', name: 'Mike & Co. Studios', category: 'Photography', price: '$3,000', rating: 4.7, vicinity: 'Arts District' }
        ]
      }
    };
    
    setGeneratedData(mockData);
    setCurrentStep('swiping');
    showSuccessToast('Your personalized wedding plan has been created!');
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
      
      setCurrentStep('complete');
      showSuccessToast('Your personalized wedding plan has been saved!');
      
      // Complete the flow after a brief delay
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
      default: return 'AI Onboarding';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-xl border border-[#AB9C95] p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-playfair font-semibold text-[#332B42]">
                {getStepTitle()}
              </h2>
              {getStepDescription() && (
                <p className="text-[#364257] text-sm">
                  {getStepDescription()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A7A7A] hover:text-[#332B42] p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {currentStep === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    className="h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Current Step */}
                <div className="text-center">
                  <p className="text-[#332B42] font-medium text-lg">
                    {currentStepText}
                  </p>
                  <p className="text-[#364257] text-sm mt-1">
                    {progress}% complete
                  </p>
                </div>

                {/* Wedding Details Summary */}
                <div className="bg-[#F8F6F4] rounded-lg p-4 border border-[#E0DBD7]">
                  <h3 className="font-medium text-[#332B42] mb-2">Creating plan for:</h3>
                  <div className="text-sm text-[#364257] space-y-1">
                    <p><span className="font-medium">Names:</span> {userName} & {partnerName}</p>
                    <p><span className="font-medium">Date:</span> {weddingDate ? new Date(weddingDate).toLocaleDateString() : 'TBD'}</p>
                    <p><span className="font-medium">Location:</span> {weddingLocation || 'TBD'}</p>
                    <p><span className="font-medium">Budget:</span> ${maxBudget.toLocaleString()}</p>
                    <p><span className="font-medium">Guests:</span> {guestCount}</p>
                    {additionalContext && (
                      <p><span className="font-medium">Additional context:</span> {additionalContext}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 'swiping' && generatedData && (
              <motion.div
                key="swiping"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <VendorSwipeInterface
                  vendors={generatedData.vendors}
                  onComplete={handleVendorSwipingComplete}
                  onSkip={() => setCurrentStep('review')}
                />
              </motion.div>
            )}

            {currentStep === 'review' && generatedData && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ReviewFlow
                  todos={generatedData.todos}
                  budget={generatedData.budget}
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
      </motion.div>
    </div>
  );
};

export default AIOnboardingFlow;
