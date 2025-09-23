import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, DollarSign, Calendar, Sparkles, Bot, User, Loader2, X, Database, Zap, ClipboardList, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { useRAGBudgetGeneration } from '@/hooks/useRAGBudgetGeneration';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useBudgetOptimized } from '@/hooks/useBudgetOptimized';

// Helper function to generate fallback due dates
function generateFallbackDueDate(itemName: string, categoryName: string): Date {
  const today = new Date();
  const dueDate = new Date(today);
  
  // Generate due dates based on category and item type
  const itemLower = itemName.toLowerCase();
  const categoryLower = categoryName.toLowerCase();
  
  if (categoryLower.includes('venue') || categoryLower.includes('catering')) {
    dueDate.setMonth(dueDate.getMonth() + 6); // 6 months out
  } else if (categoryLower.includes('photography') || categoryLower.includes('videography')) {
    dueDate.setMonth(dueDate.getMonth() + 4); // 4 months out
  } else if (categoryLower.includes('flower') || categoryLower.includes('decor')) {
    dueDate.setMonth(dueDate.getMonth() + 3); // 3 months out
  } else if (categoryLower.includes('music') || categoryLower.includes('entertainment')) {
    dueDate.setMonth(dueDate.getMonth() + 3); // 3 months out
  } else if (categoryLower.includes('attire') || categoryLower.includes('beauty')) {
    dueDate.setMonth(dueDate.getMonth() + 2); // 2 months out
  } else {
    dueDate.setMonth(dueDate.getMonth() + 2); // Default 2 months out
  }
  
  return dueDate;
}

// Helper function to safely parse dates
function parseValidDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return null;
    }
    
    // Ensure date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    
    if (date < today) {
      console.warn('Date is in the past, skipping:', dateString);
      return null;
    }
    
    return date;
  } catch (error) {
    console.warn('Error parsing date:', dateString, error);
    return null;
  }
}

interface AIBudgetAssistantRAGOptimizedProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateBudget: (description: string, budget: number, aiBudget?: any) => Promise<void>;
  onGenerateTodoList: (description: string) => Promise<void>;
  onGenerateIntegratedPlan: (description: string, budget: number) => Promise<void>;
  weddingDate: Date | null;
  totalBudget: number | null;
  onCreditError?: (creditInfo: { requiredCredits: number; currentCredits: number; feature: string }) => void;
  setIsCreatingBudget: (isCreating: boolean) => void;
  setBudgetCreationProgress: (progress: { current: number; total: number; currentItem: string } | null) => void;
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

const AIBudgetAssistantRAGOptimized: React.FC<AIBudgetAssistantRAGOptimizedProps> = React.memo(({
  isOpen,
  onClose,
  onGenerateBudget,
  onGenerateTodoList,
  onGenerateIntegratedPlan,
  weddingDate,
  totalBudget,
  onCreditError,
  setIsCreatingBudget,
  setBudgetCreationProgress,
}) => {
  // State management
  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCreditError, setHasCreditError] = useState(false);

  // Hooks
  const { generateBudget, isLoading: ragLoading, error: ragError } = useRAGBudgetGeneration();
  const { style, cityState, selectedVenueMetadata, weddingDate: userWeddingDate, guestCount, maxBudget } = useUserProfileData();
  const { updateUserMaxBudget } = useBudgetOptimized();

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Memoized values for better performance
  const canSubmit = useMemo(() => 
    description.trim().length > 0 && 
    parseFloat(budgetAmount) > 0 && 
    !isGenerating && 
    !ragLoading,
    [description, budgetAmount, isGenerating, ragLoading]
  );

  const budgetExceedsMax = useMemo(() => 
    maxBudget && parseFloat(budgetAmount) > maxBudget,
    [maxBudget, budgetAmount]
  );

  const budgetDifference = useMemo(() => 
    maxBudget ? parseFloat(budgetAmount) - maxBudget : 0,
    [maxBudget, budgetAmount]
  );

  // Auto-populate description when component opens
  useEffect(() => {
    if (isOpen && !description) {
      const autoDescription = `Budget breakdown for a ${style || 'elegant'} style wedding in ${cityState || 'your chosen city'}${selectedVenueMetadata?.name ? ` at ${selectedVenueMetadata.name}` : ''}${userWeddingDate ? ` on ${userWeddingDate.toLocaleDateString()}` : ''}${guestCount ? ` for ${guestCount} guests` : ''}`;
      setDescription(autoDescription);
    }
  }, [isOpen, description, style, cityState, selectedVenueMetadata, userWeddingDate, guestCount]);

  // Update budget amount when maxBudget changes
  useEffect(() => {
    if (maxBudget && !budgetAmount) {
      setBudgetAmount(maxBudget.toString());
    }
  }, [maxBudget, budgetAmount]);

  // Optimized generation function
  const performGeneration = useCallback(async () => {

    setIsGenerating(true);
    setError(null);
    setHasCreditError(false);

    try {
      const budgetResponse = await generateBudget({
        description,
        totalBudget: parseFloat(budgetAmount) || 0,
        weddingDate: userWeddingDate?.toISOString() || new Date().toISOString(),
        budgetType: 'comprehensive'
      });

      if (budgetResponse.success && budgetResponse.budget) {
        // Transform RAG response to match expected format
        const transformedBudget = {
          categories: budgetResponse.budget.categories.map((category: any) => ({
            name: category.name,
            allocatedAmount: category.amount || 0,
            color: getCategoryColor(category.name),
             items: (category.subcategories || []).map((sub: any) => {
               let dueDate = sub.dueDate ? parseValidDate(sub.dueDate) : null;
               // Generate fallback due date if AI didn't provide one
               if (!dueDate) {
                 dueDate = generateFallbackDueDate(sub.name, category.name);
               }
               
               return {
                 name: sub.name,
                 amount: sub.amount || 0, // Planned amount - realistic cost estimate
                 allocatedAmount: sub.amount || 0, // Same as planned amount for new items
                 dueDate: dueDate, // Due date from AI or fallback
                 priority: sub.priority || 'Medium',
                 notes: sub.notes || '',
                 isPaid: false, // New items are not paid yet
                 amountSpent: null // No amount spent for new items
               };
             })
          }))
        };

        // Validate that AI-generated budget doesn't exceed max budget (with 10% flexibility buffer)
        const totalAllocatedAmount = transformedBudget.categories.reduce((sum, cat) => sum + (cat.allocatedAmount || 0), 0);
        const userMaxBudget = maxBudget || 0;
        const flexibilityBuffer = userMaxBudget * 0.1; // 10% buffer for realistic planning
        const maxAllowedBudget = userMaxBudget + flexibilityBuffer;
        
        if (userMaxBudget > 0 && totalAllocatedAmount > maxAllowedBudget) {
          const overageAmount = totalAllocatedAmount - maxAllowedBudget;
          const overagePercentage = Math.round((overageAmount / userMaxBudget) * 100);
          
          // Show warning and stop budget generation
          setError(
            `AI-generated budget exceeds your max budget by $${overageAmount.toLocaleString()} (${overagePercentage}% over). ` +
            `Total: $${totalAllocatedAmount.toLocaleString()} vs Max: $${userMaxBudget.toLocaleString()} (with 10% flexibility). ` +
            `Please adjust your budget or try generating with a different description.`
          );
          setIsGenerating(false);
          return;
        }

         // Call onGenerateBudget with the transformed budget data (no additional API call needed)
         await onGenerateBudget(description, parseFloat(budgetAmount) || 0, transformedBudget);

         // Credits are already deducted by the API middleware, no need to refresh
      } else {
        throw new Error('Failed to generate budget');
      }
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
    } finally {
      setIsGenerating(false);
    }
  }, [description, budgetAmount, userWeddingDate, generateBudget, onGenerateBudget, onCreditError]);

  // Optimized generate handler
  const handleGenerate = useCallback(async () => {
    if (!description.trim() || !canSubmit || isGenerating) return;

    try {
      await performGeneration();
      onClose();
    } catch (error: any) {
      console.error('Error generating budget:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    }
  }, [description, canSubmit, isGenerating, performGeneration, onClose]);

  // Handle budget amount change with validation
  const handleBudgetAmountChange = useCallback((value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setBudgetAmount(value);
      setShowOverwriteWarning(numValue > (maxBudget || 0));
    }
  }, [maxBudget]);

  // Handle max budget update
  const handleUpdateMaxBudget = useCallback(async () => {
    if (budgetExceedsMax) {
      await updateUserMaxBudget(parseFloat(budgetAmount));
      setShowOverwriteWarning(false);
    }
  }, [budgetExceedsMax, budgetAmount, updateUserMaxBudget]);

  // Helper function for category colors
  const getCategoryColor = (categoryName: string): string => {
    const colors: Record<string, string> = {
      'Venue & Location': '#A85C36',
      'Catering & Food': '#8B4513',
      'Photography & Video': '#2F4F4F',
      'Attire & Accessories': '#8A2BE2',
      'Flowers & Decor': '#FF69B4',
      'Music & Entertainment': '#32CD32',
      'Transportation': '#4169E1',
      'Wedding Rings': '#FFD700',
      'Stationery & Paper': '#DC143C',
      'Beauty & Health': '#FF1493',
      'Wedding Planner': '#00CED1',
      'Miscellaneous': '#696969',
    };
    return colors[categoryName] || '#696969';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">AI Budget Assistant</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* What Paige will do */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-2">What Paige will do:</h3>
                <p className="text-sm text-blue-800">
                  I'll analyze your wedding details and create a comprehensive budget breakdown with realistic categories, cost estimates, and personalized recommendations based on your location, style, and guest count.
                </p>
              </div>
            </div>
          </div>

          {/* Budget Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Describe your budget breakdown
            </label>
            <textarea
              ref={inputRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your wedding vision and budget priorities..."
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Max Budget */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Max Budget
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={budgetAmount}
                onChange={(e) => handleBudgetAmountChange(e.target.value)}
                placeholder="Enter your total budget"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Budget Warning */}
            {showOverwriteWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Are you sure?</p>
                    <p>
                      Your budget of ${parseFloat(budgetAmount).toLocaleString()} exceeds your current max budget by ${budgetDifference.toLocaleString()}. 
                      Max budget will be increased to ${parseFloat(budgetAmount).toLocaleString()} by clicking Generate.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate (5 Credits)</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
});

AIBudgetAssistantRAGOptimized.displayName = 'AIBudgetAssistantRAGOptimized';

export default AIBudgetAssistantRAGOptimized;
