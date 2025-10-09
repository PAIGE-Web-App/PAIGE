'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => void;
  userId: string;
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
  userId,
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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [freshWeddingData, setFreshWeddingData] = useState<any>(null);
  const { showSuccessToast, showErrorToast } = useCustomToast();

  // Helper function to format wedding date
  const formatWeddingDate = (date: any, weddingDateUndecided?: boolean): string => {
    // If wedding date is undecided, return TBD regardless of date value
    if (weddingDateUndecided) return 'TBD';
    
    if (!date) return 'TBD';
    
    try {
      // If it's a string, try to parse it directly
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return 'TBD';
        return parsedDate.toLocaleDateString();
      }
      
      // If it's an object with toDate method (Firestore Timestamp)
      if (typeof date === 'object' && date !== null && 'toDate' in date) {
        const firestoreDate = (date as any).toDate();
        if (isNaN(firestoreDate.getTime())) return 'TBD';
        return firestoreDate.toLocaleDateString();
      }
      
      // If it's already a Date object
      if (date instanceof Date) {
        if (isNaN(date.getTime())) return 'TBD';
        return date.toLocaleDateString();
      }
      
      // Fallback: try to create a Date object
      const fallbackDate = new Date(date);
      if (isNaN(fallbackDate.getTime())) return 'TBD';
      return fallbackDate.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting wedding date:', error, 'Date value:', date);
      return 'TBD';
    }
  };

  const steps = [
    'Analyzing your wedding details...',
    'Generating personalized to-do list...',
    'Creating budget breakdown...',
    'Finding local vendors...',
    'Finalizing your plan...'
  ];

  // Fetch fresh wedding data when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      const fetchFreshWeddingData = async () => {
        setIsLoadingData(true);
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFreshWeddingData(data);
          }
        } catch (error) {
          console.error('Error fetching fresh wedding data:', error);
        } finally {
          setIsLoadingData(false);
        }
      };
      
      fetchFreshWeddingData();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen && !isLoadingData) {
      startGeneration();
    }
  }, [isOpen, isLoadingData]);

  const startGeneration = async () => {
    setIsGenerating(true);
    setProgress(0);
    
    try {
      // Prepare wedding data using fresh data from Firestore
      const weddingData = {
        userName: freshWeddingData?.userName || userName,
        partnerName: freshWeddingData?.partnerName || partnerName,
        weddingDate: freshWeddingData?.weddingDate || weddingDate,
        weddingDateUndecided: freshWeddingData?.weddingDateUndecided || false,
        weddingLocation: freshWeddingData?.weddingLocation || weddingLocation,
        selectedVenueMetadata: freshWeddingData?.selectedVenueMetadata || selectedVenueMetadata,
        maxBudget: freshWeddingData?.maxBudget || maxBudget,
        guestCount: freshWeddingData?.guestCount || guestCount,
        vibe: freshWeddingData?.vibe || vibe,
        additionalContext: freshWeddingData?.additionalContext || additionalContext
      };

      // Start with initial progress
      setCurrentStep(steps[0]);
      setProgress(10);
      
      // Make the actual API call to RAG endpoint
      const response = await fetch('/api/onboarding/generate-preliminary-rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          weddingData
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('RAG API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to generate preliminary content: ${response.status} ${response.statusText}`);
      }

      // Update progress during API call
      setCurrentStep(steps[1]);
      setProgress(30);
      
      const result = await response.json();
      
      // Simulate final processing steps
      setCurrentStep(steps[2]);
      setProgress(60);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentStep(steps[3]);
      setProgress(80);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentStep(steps[4]);
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Complete generation
      setIsGenerating(false);
      
      // Pass the generated data to parent
      // Data generated successfully
      onComplete(result.data);
      
    } catch (error) {
      console.error('Error generating preliminary content:', error);
      setIsGenerating(false);
      showErrorToast('Failed to generate your wedding plan. Please try again.');
    }
  };

  if (!isOpen) {
    // Modal not open
    return null;
  }
  
  // Rendering modal

  return (
    <AnimatePresence>
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
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with title only */}
          <div className="mb-4">
            <h5 className="h5 text-left">Paige is creating your plan</h5>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 text-left">Hang tight! This will just take a moment.</p>
          </div>

          {/* Sparkles Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-4 mb-6">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="h-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Current Step */}
            <div className="text-center">
              <p className="text-[#332B42] font-medium text-sm">
                {currentStep}
              </p>
              <p className="text-gray-600 text-xs mt-1">
                {progress}% complete
              </p>
            </div>
          </div>

          {/* Wedding Details Summary */}
          <div className="mb-6">
            <h6 className="font-medium text-[#332B42] mb-3">Creating plan for:</h6>
            <div className="text-sm text-gray-600 space-y-1">
              {isLoadingData ? (
                // Skeleton states while loading fresh data
                <>
                  <p><span className="font-medium">Names:</span> <span className="animate-pulse bg-gray-200 h-4 w-24 inline-block rounded"></span></p>
                  <p><span className="font-medium">Wedding Date:</span> <span className="animate-pulse bg-gray-200 h-4 w-16 inline-block rounded"></span></p>
                  <p><span className="font-medium">Location:</span> <span className="animate-pulse bg-gray-200 h-4 w-32 inline-block rounded"></span></p>
                  <p><span className="font-medium">Budget:</span> <span className="animate-pulse bg-gray-200 h-4 w-20 inline-block rounded"></span></p>
                  <p><span className="font-medium">Guests:</span> <span className="animate-pulse bg-gray-200 h-4 w-12 inline-block rounded"></span></p>
                </>
              ) : (
                // Show fresh data from Firestore
                <>
                  <p><span className="font-medium">Names:</span> {freshWeddingData?.userName || userName} & {freshWeddingData?.partnerName || partnerName}</p>
                  <p><span className="font-medium">Wedding Date:</span> {formatWeddingDate(freshWeddingData?.weddingDate || weddingDate, freshWeddingData?.weddingDateUndecided)}</p>
                  <p><span className="font-medium">Location:</span> {freshWeddingData?.weddingLocation || weddingLocation || 'TBD'}</p>
                  <p><span className="font-medium">Budget:</span> ${(freshWeddingData?.maxBudget || maxBudget).toLocaleString()}</p>
                  <p><span className="font-medium">Guests:</span> {freshWeddingData?.guestCount || guestCount}</p>
                  {(freshWeddingData?.additionalContext || additionalContext) && (
                    <p><span className="font-medium">Additional context:</span> {freshWeddingData?.additionalContext || additionalContext}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIGenerationModal;
