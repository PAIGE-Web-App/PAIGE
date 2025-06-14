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
      {steps.map((step) => (
        <li
          key={step.id}
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onStepChange && onStepChange(step.id)}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
              ${currentStep === step.id
                ? 'bg-[#332B42] text-white'
                : 'bg-[#E0DBD7] text-[#7A7A7A] group-hover:bg-[#D6CFC8]'}
            `}
          >
            {step.id}
          </div>
          <span
            className={`text-sm font-medium transition-colors duration-300
              ${currentStep === step.id ? 'text-[#332B42]' : 'text-[#7A7A7A] group-hover:text-[#332B42]'}`}
          >
            {step.name}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default Stepper; 