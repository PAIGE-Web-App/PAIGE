import React from 'react';

interface Step {
  id: number;
  name: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange?: (step: number) => void;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onStepChange }) => {
  return (
    <ul className="space-y-4">
      {steps.map((step) => {
        const isActive = currentStep === step.id;
        const isCompleted = step.id < currentStep;
        const canNavigateTo = isActive || isCompleted;
        
        return (
          <li
            key={step.id}
            className={`flex items-center gap-3 ${
              canNavigateTo ? 'cursor-pointer group' : 'cursor-not-allowed opacity-60'
            }`}
            onClick={canNavigateTo && onStepChange ? () => onStepChange(step.id) : undefined}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                ${isActive
                  ? 'bg-[#332B42] text-white'
                  : isCompleted
                  ? 'bg-green-500 text-white'
                  : 'bg-[#E0DBD7] text-[#7A7A7A]'}
              `}
            >
              {isCompleted ? '✓' : step.id}
            </div>
            <span
              className={`text-sm font-medium transition-colors duration-300
                ${isActive ? 'text-[#332B42]' : isCompleted ? 'text-[#7A7A7A] group-hover:text-[#332B42]' : 'text-[#7A7A7A]'}`}
            >
              {step.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default Stepper; 