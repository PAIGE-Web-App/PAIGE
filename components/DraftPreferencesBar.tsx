"use client";

import React from "react";
import { WandSparkles, RefreshCw } from "lucide-react";

interface DraftPreferencesBarProps {
  communicationPreferences: {
    generalTone: 'friendly' | 'professional' | 'casual' | 'formal';
    negotiationStyle: 'assertive' | 'collaborative' | 'diplomatic' | 'direct';
    formalityLevel: 'very-casual' | 'casual' | 'professional' | 'very-formal';
  };
  onRegenerate: (commPrefs: {
    generalTone: 'friendly' | 'professional' | 'casual' | 'formal';
    negotiationStyle: 'assertive' | 'collaborative' | 'diplomatic' | 'direct';
    formalityLevel: 'very-casual' | 'casual' | 'professional' | 'very-formal';
  }, action?: string) => void;
  onOpenAdditionalContext?: () => void;
  isRegenerating: boolean;
}

const ACTION_PILLS = [
  { id: 'shorter', label: 'Shorter', description: 'Make the message more concise' },
  { id: 'longer', label: 'Longer', description: 'Add more detail' },
  { id: 'more-formal', label: 'More Formal', description: 'Increase formality' },
  { id: 'more-casual', label: 'More Casual', description: 'Make it more relaxed' },
  { id: 'schedule-meeting', label: 'Schedule Meeting', description: 'Add meeting request' },
  { id: 'additional-context', label: 'Additional Context', description: 'Add more context to the message' },
];

const DraftPreferencesBar: React.FC<DraftPreferencesBarProps> = ({
  communicationPreferences,
  onRegenerate,
  onOpenAdditionalContext,
  isRegenerating
}) => {
  const handlePillClick = (actionId: string) => {
    if (actionId === 'additional-context' && onOpenAdditionalContext) {
      onOpenAdditionalContext();
    } else {
      onRegenerate(communicationPreferences, actionId);
    }
  };

  return (
    <div className="border-t border-[#E0DBD7] bg-[#F9F8F7] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Header with icon */}
        <div className="flex items-center gap-2">
          <WandSparkles className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-work-sans font-semibold text-[#332B42]">
            Regenerate Draft
          </span>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap gap-2">
          {ACTION_PILLS.map((pill) => (
            <button
              key={pill.id}
              onClick={() => handlePillClick(pill.id)}
              disabled={isRegenerating}
              className="px-3 py-1.5 text-xs font-work-sans font-medium text-[#332B42] bg-white border border-[#E0DBD7] rounded-full hover:bg-purple-50 hover:border-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={pill.description}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Regenerating indicator */}
        {isRegenerating && (
          <div className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-purple-600 animate-spin" />
            <span className="text-xs text-[#7A7A7A]">Regenerating...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftPreferencesBar;

