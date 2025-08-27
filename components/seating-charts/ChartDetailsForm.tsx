import React from 'react';
import { WizardState } from './types';

interface ChartDetailsFormProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  areChartDetailsComplete: boolean;
}

export default function ChartDetailsForm({ wizardState, onUpdate, areChartDetailsComplete }: ChartDetailsFormProps) {
  const handleInputChange = (field: keyof WizardState, value: string) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="bg-white rounded-[5px] border border-[#AB9C95] p-6 mb-6">
      <h3 className="text-lg font-playfair font-semibold text-[#332B42] mb-4">Chart Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              placeholder="e.g., Wedding Reception"
            />
          </label>
        </div>

        {/* Event Type */}
        <div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#332B42]">Event Type *</span>
            <div className="relative">
              <select
                value={wizardState.eventType}
                onChange={(e) => {
                  handleInputChange('eventType', e.target.value);
                  setTimeout(() => {/* TODO: Auto-save */}, 100);
                }}
                className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] pr-10"
              >
                <option value="">Select Event Type</option>
                <option value="Wedding Reception">Wedding Reception</option>
                <option value="Wedding Ceremony">Wedding Ceremony</option>
                <option value="Cocktail Hour">Cocktail Hour</option>
                <option value="Rehearsal Dinner">Rehearsal Dinner</option>
                <option value="Bridal Shower">Bridal Shower</option>
                <option value="Bachelor Party">Bachelor Party</option>
                <option value="Bachelorette Party">Bachelorette Party</option>
                <option value="Other">Other</option>
              </select>
              {/* Custom chevron icon */}
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#332B42]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </label>
        </div>
      </div>

      {/* Custom Event Type Description */}
      {wizardState.eventType === 'Other' && (
        <div className="mt-6">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#332B42]">Custom Event Type</span>
            <input
              type="text"
              value={wizardState.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              onBlur={() => setTimeout(() => {/* TODO: Auto-save */}, 100)}
              className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
              placeholder="Describe your event type"
            />
          </label>
        </div>
      )}
    </div>
  );
}
