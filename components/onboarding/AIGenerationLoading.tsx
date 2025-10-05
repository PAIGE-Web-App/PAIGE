'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, Clock, Users, DollarSign, Calendar } from 'lucide-react';

interface AIGenerationLoadingProps {
  userName: string;
  partnerName: string;
  onComplete: (generatedData: any) => void;
  onError: (error: string) => void;
}

const AIGenerationLoading: React.FC<AIGenerationLoadingProps> = ({
  userName,
  partnerName,
  onComplete,
  onError
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      id: 'analyzing',
      title: 'Analyzing your preferences',
      description: 'Understanding your wedding vision and style',
      icon: Sparkles,
      duration: 2000
    },
    {
      id: 'vendors',
      title: 'Finding perfect vendors',
      description: 'Searching for local venues, photographers, and more',
      icon: Users,
      duration: 3000
    },
    {
      id: 'budget',
      title: 'Creating your budget',
      description: 'Building a detailed budget breakdown',
      icon: DollarSign,
      duration: 2500
    },
    {
      id: 'todos',
      title: 'Planning your timeline',
      description: 'Generating your personalized to-do list',
      icon: Calendar,
      duration: 2000
    },
    {
      id: 'finalizing',
      title: 'Finalizing your plan',
      description: 'Putting everything together for you',
      icon: CheckCircle,
      duration: 1500
    }
  ];

  useEffect(() => {
    let stepIndex = 0;
    let progressInterval: NodeJS.Timeout;

    const runSteps = () => {
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex);
        
        // Animate progress for this step
        let stepProgress = 0;
        const stepDuration = steps[stepIndex].duration;
        const progressIncrement = 100 / (stepDuration / 50);
        
        progressInterval = setInterval(() => {
          stepProgress += progressIncrement;
          if (stepProgress >= 100) {
            stepProgress = 100;
            clearInterval(progressInterval);
            stepIndex++;
            setTimeout(runSteps, 500); // Brief pause between steps
          }
          setProgress(Math.min(stepIndex * 20 + (stepProgress / 5), 100));
        }, 50);
      } else {
        // All steps complete
        setTimeout(() => {
          // Simulate API call to generate data
          generateWeddingPlan();
        }, 1000);
      }
    };

    runSteps();

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, []);

  const generateWeddingPlan = async () => {
    try {
      // This would call your actual API endpoint
      // const response = await fetch('/api/onboarding/generate-preliminary', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userName, partnerName, ... })
      // });
      
      // For now, simulate the response
      const mockData = {
        todos: [
          { id: '1', title: 'Book your venue', completed: false, priority: 'high' },
          { id: '2', title: 'Hire a photographer', completed: false, priority: 'high' },
          { id: '3', title: 'Choose your wedding party', completed: false, priority: 'medium' }
        ],
        budget: {
          total: 35000,
          categories: [
            { name: 'Venue', amount: 15000, percentage: 43 },
            { name: 'Photography', amount: 5000, percentage: 14 },
            { name: 'Catering', amount: 8000, percentage: 23 }
          ]
        },
        vendors: {
          venues: [
            { id: '1', name: 'Garden Manor', category: 'Venue', price: '$12,000', rating: 4.8 },
            { id: '2', name: 'Riverside Estate', category: 'Venue', price: '$15,000', rating: 4.9 }
          ],
          photographers: [
            { id: '3', name: 'Sarah Johnson Photography', category: 'Photographer', price: '$4,500', rating: 4.9 },
            { id: '4', name: 'Mike Chen Studios', category: 'Photographer', price: '$5,200', rating: 4.7 }
          ]
        }
      };

      onComplete(mockData);
    } catch (error) {
      onError('Failed to generate your wedding plan. Please try again.');
    }
  };

  const currentStepData = steps[currentStep] || steps[0];
  const IconComponent = currentStepData.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto text-center"
    >
      <div className="mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#A85C36] to-[#8B4513] rounded-full flex items-center justify-center"
        >
          <Sparkles className="w-12 h-12 text-white" />
        </motion.div>
        
        <h1 className="text-3xl font-playfair font-semibold text-[#332B42] mb-4">
          Paige is creating your personalized wedding plan
        </h1>
        
        <p className="text-[#364257] text-lg">
          This will take just a moment while we find the perfect vendors and create your timeline.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="w-full bg-[#E0D6D0] rounded-full h-3 mb-4">
          <motion.div
            className="bg-gradient-to-r from-[#A85C36] to-[#8B4513] h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-sm text-[#364257]">
          {Math.round(progress)}% complete
        </p>
      </div>

      {/* Current Step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg border border-[#AB9C95] p-6 mb-8"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <IconComponent className="w-8 h-8 text-[#A85C36]" />
            </motion.div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-[#332B42]">
                {currentStepData.title}
              </h3>
              <p className="text-[#364257]">
                {currentStepData.description}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* All Steps Overview */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                isCompleted 
                  ? 'bg-green-50 border border-green-200' 
                  : isCurrent 
                    ? 'bg-[#A85C36]/10 border border-[#A85C36]/30' 
                    : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isCurrent 
                    ? 'bg-[#A85C36] text-white' 
                    : 'bg-gray-300 text-gray-600'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium ${
                  isCompleted || isCurrent ? 'text-[#332B42]' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className={`text-sm ${
                  isCompleted || isCurrent ? 'text-[#364257]' : 'text-gray-400'
                }`}>
                  {step.description}
                </p>
              </div>
              {isCurrent && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 bg-[#A85C36] rounded-full"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AIGenerationLoading;
