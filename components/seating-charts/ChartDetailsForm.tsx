import React, { useState, useEffect } from 'react';
import { WizardState } from './types';

interface ChartDetailsFormProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  areChartDetailsComplete: boolean;
  showValidationErrors?: boolean;
}

export default function ChartDetailsForm({ 
  wizardState, 
  onUpdate, 
  areChartDetailsComplete,
  showValidationErrors = false
}: ChartDetailsFormProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const handleInputChange = (field: keyof WizardState, value: string) => {
    onUpdate({ [field]: value });
    setHasInteracted(true);
  };
  
  // Show error if validation is requested and chart name is empty
  const showError = showValidationErrors && !wizardState.chartName.trim();

  return (
    <div>
      <h3 className="text-lg font-playfair font-semibold text-[#332B42] mb-4">Chart Details and Guest List</h3>
      
      <div className="w-1/3">
        {/* Chart Name */}
        <div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#332B42]">Chart Name *</span>
            <input
              type="text"
              value={wizardState.chartName}
              onChange={(e) => handleInputChange('chartName', e.target.value)}
              onBlur={() => setTimeout(() => {/* TODO: Auto-save */}, 100)}
              className={`w-full border px-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 ${
                showError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-[#AB9C95] focus:ring-[#A85C36]'
              }`}
              placeholder="e.g. Wedding Reception"
            />
            {showError && (
              <p className="text-red-500 text-xs mt-1">Chart name is required</p>
            )}
          </label>
        </div>
      </div>
    </div>
  );
}
