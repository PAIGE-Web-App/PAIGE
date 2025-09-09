import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, DollarSign, Calendar, Sparkles, Bot, User, Loader2, X, Database, Zap, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { useRAGBudgetGeneration } from '@/hooks/useRAGBudgetGeneration';

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
  const [budgetAmount, setBudgetAmount] = useState(totalBudget?.toString() || '');
  const [selectedOption, setSelectedOption] = useState<'budget' | 'todo' | 'integrated'>('integrated');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCreditError, setHasCreditError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { generateBudget, isLoading: ragLoading, error: ragError } = useRAGBudgetGeneration();
  
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

  // Focus input when component mounts
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleGenerate = useCallback(async () => {
    if (!description.trim() || !canSubmit) return;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('AI Budget Assistant RAG - handleGenerate called:', {
        selectedOption,
        hasExistingBudget: totalBudget && totalBudget > 0,
        totalBudget
      });
    }
    
    // Show overwrite warning for budget-related options if user has existing budget
    if ((selectedOption === 'budget' || selectedOption === 'integrated') && totalBudget && totalBudget > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Showing overwrite warning');
      }
      setShowOverwriteWarning(true);
      return;
    }
    
    await performGeneration();
  }, [description, canSubmit, selectedOption, totalBudget]);

  const performGeneration = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('AI Budget Assistant RAG - Starting generation:', {
        selectedOption,
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
      
      switch (selectedOption) {
        case 'budget':
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
                  requiredCredits: budgetError.credits?.required || 5,
                  currentCredits: budgetError.credits?.current || 0,
                  feature: budgetError.feature || 'budget generation'
                });
              }
            }
            throw budgetError;
          }
          break;
          
        case 'todo':
          if (process.env.NODE_ENV === 'development') {
            console.log('Redirecting to todo page...');
          }
          // For todo-only generation, use your existing todo system
          window.location.href = '/todo?ai-generate=true&description=' + encodeURIComponent(description);
          break;
          
        case 'integrated':
          if (process.env.NODE_ENV === 'development') {
            console.log('Generating integrated plan...');
          }
          await onGenerateIntegratedPlan(description, budget);
          onClose();
          break;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Generation completed successfully');
      }
      
    } catch (error: any) {
      console.error('Error generating:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [description, budgetAmount, selectedOption, weddingDate, generateBudget, onGenerateBudget, onGenerateIntegratedPlan, onCreditError, onClose]);


  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
      e.preventDefault();
      handleGenerate();
    }
  }, [canSubmit, handleGenerate]);

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
                  What would you like to create?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="option"
                      value="integrated"
                      checked={selectedOption === 'integrated'}
                      onChange={(e) => setSelectedOption(e.target.value as 'integrated')}
                      className="mr-3 text-[#A85C36] focus:ring-[#A85C36]"
                      disabled={isGenerating || hasCreditError}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Zap className="w-4 h-4 text-[#A85C36]" />
                      <div>
                        <div className="font-medium">Integrated Plan (5 Credits)</div>
                        <div className="text-sm text-gray-500">Budget + Todo list together</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="option"
                      value="budget"
                      checked={selectedOption === 'budget'}
                      onChange={(e) => setSelectedOption(e.target.value as 'budget')}
                      className="mr-3 text-[#A85C36] focus:ring-[#A85C36]"
                      disabled={isGenerating || hasCreditError}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <DollarSign className="w-4 h-4 text-[#A85C36]" />
                      <div>
                        <div className="font-medium">Budget Only (3 Credits)</div>
                        <div className="text-sm text-gray-500">Just the budget breakdown</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="option"
                      value="todo"
                      checked={selectedOption === 'todo'}
                      onChange={(e) => setSelectedOption(e.target.value as 'todo')}
                      className="mr-3 text-[#A85C36] focus:ring-[#A85C36]"
                      disabled={isGenerating || hasCreditError}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <ClipboardList className="w-4 h-4 text-[#A85C36]" />
                      <div>
                        <div className="font-medium">Todo List Only (2 Credits)</div>
                        <div className="text-sm text-gray-500">Just the task list</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your wedding vision
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

AIBudgetAssistantRAG.displayName = 'AIBudgetAssistantRAG';

export default AIBudgetAssistantRAG;
