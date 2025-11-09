"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, WandSparkles, Settings } from "lucide-react";
import { useUserProfileData } from "@/hooks/useUserProfileData";
import { useRouter } from "next/navigation";
import SelectField from "./SelectField";

interface DraftContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (additionalContext: string, commPrefs?: {
    generalTone: 'friendly' | 'professional' | 'casual' | 'formal';
    negotiationStyle: 'assertive' | 'collaborative' | 'diplomatic' | 'direct';
    formalityLevel: 'very-casual' | 'casual' | 'professional' | 'very-formal';
  }) => void;
  isGenerating: boolean;
  contactName?: string;
  isReply?: boolean;
  initialContext?: string;
  currentMessage?: string;
}

const DraftContextModal: React.FC<DraftContextModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  contactName,
  isReply = false,
  initialContext = "",
  currentMessage
}) => {
  const router = useRouter();
  const { communicationPreferences } = useUserProfileData();
  const [additionalContext, setAdditionalContext] = useState(initialContext);
  const [localCommPrefs, setLocalCommPrefs] = useState<{
    generalTone: 'friendly' | 'professional' | 'casual' | 'formal';
    negotiationStyle: 'assertive' | 'collaborative' | 'diplomatic' | 'direct';
    formalityLevel: 'very-casual' | 'casual' | 'professional' | 'very-formal';
  }>({
    generalTone: 'friendly',
    negotiationStyle: 'collaborative',
    formalityLevel: 'professional'
  });

  // Sync with communication preferences when they load
  useEffect(() => {
    if (communicationPreferences) {
      setLocalCommPrefs({
        generalTone: communicationPreferences.generalTone || 'friendly',
        negotiationStyle: communicationPreferences.negotiationStyle || 'collaborative',
        formalityLevel: communicationPreferences.formalityLevel || 'professional'
      });
    }
  }, [communicationPreferences]);

  // Reset additional context when modal opens/closes or initialContext changes
  useEffect(() => {
    if (isOpen) {
      setAdditionalContext(initialContext);
    }
  }, [isOpen, initialContext]);

  const handleGenerate = () => {
    console.log('[DraftContextModal] handleGenerate called with:', {
      additionalContext: additionalContext.trim(),
      hasCommPrefs: !!localCommPrefs
    });
    onGenerate(additionalContext.trim(), localCommPrefs);
    setAdditionalContext(""); // Reset after generating
  };

  const handleClose = () => {
    setAdditionalContext(""); // Reset on close
    // Reset to saved preferences
    if (communicationPreferences) {
      setLocalCommPrefs({
        generalTone: communicationPreferences.generalTone || 'friendly',
        negotiationStyle: communicationPreferences.negotiationStyle || 'collaborative',
        formalityLevel: communicationPreferences.formalityLevel || 'professional'
      });
    }
    onClose();
  };

  const handleCommPrefChange = (field: 'generalTone' | 'negotiationStyle' | 'formalityLevel', value: string) => {
    setLocalCommPrefs((prev) => ({ ...prev, [field]: value }));
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    // Use setTimeout to ensure modal closes before navigation
    setTimeout(() => {
      router.push('/settings?tab=communication');
    }, 100);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 z-50"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#E0DBD7] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 rounded-full p-2">
                    <WandSparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-work-sans font-semibold text-[#332B42]">
                      {isReply ? 'Draft Response' : 'Draft Message'}
                    </h2>
                    {contactName && (
                      <p className="text-sm text-[#7A7A7A] mt-0.5">
                        {isReply ? 'Replying to' : 'To'}: {contactName}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full transition-colors"
                  title="Close"
                  disabled={isGenerating}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Additional Context Input */}
                <div>
                  <label className="block text-sm font-work-sans font-medium text-[#332B42] mb-2">
                    Additional Context (Optional)
                  </label>
                  <p className="text-xs text-[#7A7A7A] mb-3">
                    Provide any additional details, specific requests, or context you'd like Paige to consider when drafting this message.
                  </p>
                  <textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder={isReply ? `Add any additional context for your reply to ${contactName}...` : currentMessage ? `Add additional context to update the message below...` : `Add any additional context for your message to ${contactName}...`}
                    className="w-full min-h-[120px] p-3 border border-[#E0DBD7] rounded-[5px] text-sm font-work-sans text-[#332B42] placeholder:text-[#7A7A7A] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    disabled={isGenerating}
                  />
                  {currentMessage && (
                    <div className="mt-3 p-3 bg-[#F9F8F7] border border-[#E0DBD7] rounded-lg">
                      <p className="text-xs font-work-sans font-semibold text-[#332B42] mb-2">Current Message:</p>
                      <p className="text-xs text-[#7A7A7A] whitespace-pre-wrap max-h-32 overflow-y-auto">{currentMessage}</p>
                    </div>
                  )}
                </div>

                {/* Communication Preferences Display */}
                <div className="border-t border-[#E0DBD7] pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-work-sans font-semibold text-[#332B42]">
                      Communication Style
                    </h3>
                    <button
                      onClick={handleSettingsClick}
                      className="flex items-center gap-1.5 text-xs text-[#7A7A7A] hover:text-[#A85C36] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Update in Settings</span>
                    </button>
                  </div>
                  <p className="text-xs text-[#7A7A7A] mb-4">
                    Customize how this message will be written. Changes here apply only to this draft.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* General Tone */}
                    <SelectField
                      label="General Tone"
                      name="generalTone"
                      value={localCommPrefs.generalTone}
                      onChange={(e) => handleCommPrefChange('generalTone', e.target.value)}
                      options={[
                        { value: 'friendly', label: 'Friendly' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'casual', label: 'Casual' },
                        { value: 'formal', label: 'Formal' }
                      ]}
                    />

                    {/* Negotiation Style */}
                    <SelectField
                      label="Negotiation Style"
                      name="negotiationStyle"
                      value={localCommPrefs.negotiationStyle}
                      onChange={(e) => handleCommPrefChange('negotiationStyle', e.target.value)}
                      options={[
                        { value: 'collaborative', label: 'Collaborative' },
                        { value: 'diplomatic', label: 'Diplomatic' },
                        { value: 'direct', label: 'Direct' },
                        { value: 'assertive', label: 'Assertive' }
                      ]}
                    />

                    {/* Formality Level */}
                    <SelectField
                      label="Formality Level"
                      name="formalityLevel"
                      value={localCommPrefs.formalityLevel}
                      onChange={(e) => handleCommPrefChange('formalityLevel', e.target.value)}
                      options={[
                        { value: 'very-casual', label: 'Very Casual' },
                        { value: 'casual', label: 'Casual' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'very-formal', label: 'Very Formal' }
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E0DBD7] flex-shrink-0">
                <button
                  onClick={handleClose}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm font-work-sans font-medium text-[#7A7A7A] hover:text-[#332B42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn-gradient-purple flex items-center gap-2 px-4 py-2 text-sm font-work-sans font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <span className="spinner mr-2" />
                      <span>GENERATING...</span>
                    </>
                  ) : (
                    <>
                      <WandSparkles className="w-4 h-4" />
                      <span>Generate Draft (1 Credit)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DraftContextModal;

