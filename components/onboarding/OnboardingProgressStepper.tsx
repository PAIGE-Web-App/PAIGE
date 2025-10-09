'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface OnboardingProgressStepperProps {
  currentStep: 'vendors' | 'todo' | 'budget';
  onStepChange?: (step: 'vendors' | 'todo' | 'budget') => void;
}

const OnboardingProgressStepper: React.FC<OnboardingProgressStepperProps> = ({
  currentStep,
  onStepChange
}) => {
  const steps = [
    { key: 'vendors', label: 'Vendors', number: 1 },
    { key: 'todo', label: 'To-Dos', number: 2 },
    { key: 'budget', label: 'Budget', number: 3 }
  ];

  return (
    <div className="flex items-center gap-3">
      {steps.map((step) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              currentStep === step.key
                ? 'bg-[#A85C36]'
                : 'bg-[#D1D5DB]'
            }`}
          />
          <span className={`text-xs font-medium ${
            currentStep === step.key
              ? 'text-[#A85C36]'
              : 'text-[#6B7280]'
          }`}>
            {step.label}
          </span>
          {step.key !== 'budget' && (
            <div className="w-4 h-px bg-[#E5E7EB] ml-1" />
          )}
        </div>
      ))}
    </div>
  );
};

export default OnboardingProgressStepper;
