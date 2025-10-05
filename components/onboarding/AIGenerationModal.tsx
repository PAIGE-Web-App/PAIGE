'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';

interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => void;
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

const AIGenerationModal: React.FC<AIGenerationModalProps> = ({
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const { showSuccessToast, showErrorToast } = useCustomToast();

  const steps = [
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
    setIsGenerating(true);
    setProgress(0);
    
    // Simulate AI generation with progress updates
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i]);
      setProgress((i + 1) * 20);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Complete generation
    setIsGenerating(false);
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
    
    // Don't show toast here - let the parent handle it
    onComplete(mockData);
  };

  if (!isOpen) {
    console.log('AIGenerationModal: not open');
    return null;
  }
  
  console.log('AIGenerationModal: rendering modal');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-xl border border-[#AB9C95] p-8 max-w-2xl w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-playfair font-semibold text-[#332B42]">
                Paige is creating your plan
              </h2>
              <p className="text-[#364257] text-sm">
                This will take just a moment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A7A7A] hover:text-[#332B42] p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Section */}
        <div className="space-y-6">
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
              {currentStep}
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
        </div>
      </motion.div>
    </div>
  );
};

export default AIGenerationModal;
