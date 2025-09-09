import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, DollarSign, Calendar, Sparkles, Bot, User, Loader2, X, Database, Zap, ClipboardList, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { useRAGBudgetGeneration } from '@/hooks/useRAGBudgetGeneration';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useBudget } from '@/hooks/useBudget';

interface AIBudgetAssistantRAGProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateBudget: (description: string, budget: number) => Promise<void>;
  onGenerateTodoList: (description: string) => Promise<void>;
  onGenerateIntegratedPlan: (description: string, budget: number) => Promise<void>;
  weddingDate: Date | null;
  totalBudget: number | null;
  onCreditError?: (creditInfo: { requiredCredits: number; currentCredits: number; feature: string }) => void;
}

interface BudgetMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  budgetData?: any;
  ragEnabled?: boolean;
  isGenerating?: boolean;
}

const AIBudgetAssistantRAG: React.FC<AIBudgetAssistantRAGProps> = React.memo(({
  isOpen,
  onClose,
  onGenerateBudget,
  onGenerateTodoList,
  onGenerateIntegratedPlan,
  weddingDate,
  totalBudget,
  onCreditError,
}) => {
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('AIBudgetAssistantRAG: Component rendered with:', {
      isOpen,
      hasOnCreditError: !!onCreditError,
      totalBudget,
      weddingDate: weddingDate?.toISOString()
    });
  }

  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCreditError, setHasCreditError] = useState(false);
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [budgetWarningData, setBudgetWarningData] = useState<{
    exceedAmount: number;
    newTotalAllocated: number;
    newMaxBudget: number;
  } | null>(null);
  const [autoUpdateBudget, setAutoUpdateBudget] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { generateBudget, isLoading: ragLoading, error: ragError } = useRAGBudgetGeneration();
  const { 
    style, 
    cityState, 
    selectedVenueMetadata, 
    weddingDate, 
    guestCount, 
    maxBudget 
  } = useUserProfileData();
  const { updateMaxBudget } = useBudget();
  
  // Memoize budget validation
  const isValidBudget = useMemo(() => {
    const budget = parseFloat(budgetAmount);
    return !isNaN(budget) && budget > 0;
  }, [budgetAmount]);
  
  // Memoize form validation
  const canSubmit = useMemo(() => {
    return description.trim().length > 0 && isValidBudget && !isGenerating && !hasCreditError;
  }, [description, isValidBudget, isGenerating, hasCreditError]);
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('AIBudgetAssistantRAG: Hook initialized with:', {
      generateBudget: !!generateBudget,
      ragLoading,
      ragError
    });
  }

  // Generate default description and set default budget when component opens
  useEffect(() => {
    if (isOpen) {
      // Set default budget amount
      setBudgetAmount(maxBudget?.toString() || '');
      
      // Generate default description with user metadata
      const styleText = style ? `${style} style` : 'elegant style';
      const cityText = cityState ? `in ${cityState}` : 'in your chosen city';
      const venueText = selectedVenueMetadata?.name ? `at ${selectedVenueMetadata.name}` : 'at your chosen venue';
      const dateText = weddingDate ? `on ${new Date(weddingDate).toLocaleDateString()}` : 'on your wedding date';
      const guestText = guestCount ? `for ${guestCount} guests` : 'for your guest count';
      
      const defaultDescription = `Budget breakdown for a ${styleText} wedding ${cityText} ${venueText} ${dateText} ${guestText}`;
      setDescription(defaultDescription);
      
      inputRef.current?.focus();
    }
  }, [isOpen, maxBudget, style, cityState, selectedVenueMetadata, weddingDate, guestCount]);

  const handleGenerate = useCallback(async () => {
    if (!description.trim() || !canSubmit) return;
    
    const budget = parseFloat(budgetAmount);
    
    // Check if budget exceeds max budget
    if (maxBudget && budget > maxBudget) {
      const exceedAmount = budget - maxBudget;
      const newMaxBudget = Math.round(budget * 1.2); // Add 20% buffer
      
      setBudgetWarningData({
        exceedAmount,
        newTotalAllocated: budget,
        newMaxBudget
      });
      setShowBudgetWarning(true);
      return;
    }
    
    await performGeneration();
  }, [description, canSubmit, budgetAmount, maxBudget]);

  const performGeneration = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('AI Budget Assistant RAG - Starting budget generation:', {
        description,
        budgetAmount,
        isGenerating
      });
    }
    
    setIsGenerating(true);
    setError(null);
    setHasCreditError(false);
    
    try {
      const budget = parseFloat(budgetAmount) || 0;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Generating budget with RAG...');
      }
      
      try {
        const budgetResponse = await generateBudget({
          description,
          totalBudget: budget,
          weddingDate: weddingDate?.toISOString() || new Date().toISOString(),
          budgetType: 'comprehensive'
        });
        
        // Call the original onGenerateBudget function
        await onGenerateBudget(description, budget);
        
        // Close modal on success
        onClose();
        
      } catch (budgetError: any) {
        if (budgetError.isCreditError) {
          setHasCreditError(true);
          if (onCreditError) {
            onCreditError({
              requiredCredits: budgetError.credits?.required || 3,
              currentCredits: budgetError.credits?.current || 0,
              feature: budgetError.feature || 'budget generation'
            });
          }
        }
        throw budgetError;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Budget generation completed successfully');
      }
      
    } catch (error: any) {
      console.error('Error generating budget:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [description, budgetAmount, weddingDate, generateBudget, onGenerateBudget, onCreditError, onClose]);


  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
      e.preventDefault();
      handleGenerate();
    }
  }, [canSubmit, handleGenerate]);

  const handleContinueWithUpdate = useCallback(async () => {
    if (budgetWarningData && updateMaxBudget) {
      await updateMaxBudget(budgetWarningData.newMaxBudget);
    }
    setAutoUpdateBudget(true);
    setShowBudgetWarning(false);
    await performGeneration();
  }, [budgetWarningData, updateMaxBudget, performGeneration]);

  const handleContinueWithoutUpdate = useCallback(async () => {
    setShowBudgetWarning(false);
    setBudgetWarningData(null);
    await performGeneration();
  }, [performGeneration]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              title="Close"
            >
              <X size={20} />
            </button>

            <h5 className="h5 mb-4 text-left flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#A85C36]" />
              AI Budget Assistant
            </h5>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your budget breakdown
                </label>
                <textarea
                  ref={inputRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., Intimate garden wedding for 50 guests in California with rustic charm..."
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#A85C36] text-sm resize-none ${
                    hasCreditError ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  rows={3}
                  disabled={isGenerating || hasCreditError}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Budget
                </label>
                <input
                  type="number"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#A85C36] text-sm"
                  disabled={isGenerating || hasCreditError}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!canSubmit}
                  className="px-6 py-2 bg-[#A85C36] text-white rounded-lg hover:bg-[#8B4A2A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate
                </button>
              </div>
            </div>

            {/* Budget Warning Modal */}
            {showBudgetWarning && budgetWarningData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Are you sure?</h3>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-gray-600 mb-3">
                      Your budget of ${budgetWarningData.newTotalAllocated.toLocaleString()} exceeds your current max budget by ${budgetWarningData.exceedAmount.toLocaleString()}.
                    </p>
                    <p className="text-gray-600">
                      Would you like to update your max budget to ${budgetWarningData.newMaxBudget.toLocaleString()} to accommodate this budget?
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleContinueWithoutUpdate}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Continue without updating
                    </button>
                    <button
                      onClick={handleContinueWithUpdate}
                      className="px-6 py-2 bg-[#A85C36] text-white rounded-lg hover:bg-[#8B4A2A] transition-colors"
                    >
                      Update max budget
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

AIBudgetAssistantRAG.displayName = 'AIBudgetAssistantRAG';

export default AIBudgetAssistantRAG;
