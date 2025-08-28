import React from 'react';
import { WizardState } from './types';

interface ChartDetailsFormProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  areChartDetailsComplete: boolean;
}

export default function ChartDetailsForm({ 
  wizardState, 
  onUpdate, 
  areChartDetailsComplete 
}: ChartDetailsFormProps) {
  const handleInputChange = (field: keyof WizardState, value: string) => {
    onUpdate({ [field]: value });
  };

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
              className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
              placeholder="e.g. Wedding Reception"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
