import React from 'react';
import { WizardStep } from './types';

interface WizardSidebarProps {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
}

const WIZARD_STEPS: { key: WizardStep; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'guests', label: 'Guest Information', icon: 'Users' },
  { key: 'tables', label: 'Table Layout', icon: 'Table' },
  { key: 'organization', label: 'AI Organization', icon: 'Sparkles' }
];

export default function WizardSidebar({ currentStep, onStepClick }: WizardSidebarProps) {
  return (
    <div className="w-[300px] bg-white border-r border-[#AB9C95] flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-8">
        <h2 className="text-xl font-playfair font-semibold text-[#332B42] mb-8">Seating Chart Wizard</h2>
        
        {/* Step Navigation */}
        <ul className="space-y-4">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = currentStep === step.key;
            const isCompleted = index < WIZARD_STEPS.findIndex(s => s.key === currentStep);
            const canNavigateTo = isActive || isCompleted;
            
            return (
              <li
                key={step.key}
                className={`flex items-center gap-3 ${
                  canNavigateTo ? 'cursor-pointer group' : 'cursor-not-allowed opacity-60'
                }`}
                onClick={canNavigateTo ? () => onStepClick(step.key) : undefined}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-[#332B42] text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-[#E0DBD7] text-[#7A7A7A]'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  className={`text-sm font-medium transition-colors duration-300 ${
                    isActive ? 'text-[#332B42]' : isCompleted ? 'text-[#7A7A7A] group-hover:text-[#332B42]' : 'text-[#7A7A7A]'
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
