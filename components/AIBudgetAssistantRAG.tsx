import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, DollarSign, Calendar, Sparkles, Bot, User, Loader2, X, Database, Zap, ClipboardList, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { useRAGBudgetGeneration } from '@/hooks/useRAGBudgetGeneration';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useBudget } from '@/hooks/useBudget';

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

interface AIBudgetAssistantRAGProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateBudget: (description: string, budget: number) => Promise<void>;
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

const AIBudgetAssistantRAG: React.FC<AIBudgetAssistantRAGProps> = React.memo(({
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

  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCreditError, setHasCreditError] = useState(false);
  const [budgetWarningData, setBudgetWarningData] = useState<{
    exceedAmount: number;
    newTotalAllocated: number;
    newMaxBudget: number;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { generateBudget, isLoading: ragLoading, error: ragError } = useRAGBudgetGeneration();
  const { 
    style, 
    weddingLocation, 
    selectedVenueMetadata, 
    weddingDate: userWeddingDate, 
    guestCount, 
    maxBudget,
    profileLoading
  } = useUserProfileData();
  const { updateUserMaxBudget } = useBudget();
  
  // Memoize budget validation
  const isValidBudget = useMemo(() => {
    const budget = parseFloat(budgetAmount);
    return !isNaN(budget) && budget > 0;
  }, [budgetAmount]);
  
  // Memoize form validation
  const canSubmit = useMemo(() => {
    return description.trim().length > 0 && isValidBudget && !isGenerating && !hasCreditError;
  }, [description, isValidBudget, isGenerating, hasCreditError]);

  // Real-time budget validation
  useEffect(() => {
    const budget = parseFloat(budgetAmount);
    
    if (maxBudget && budget > maxBudget && budgetAmount.trim() !== '') {
      const exceedAmount = budget - maxBudget;
      const newMaxBudget = budget; // Use the exact budget amount, no buffer
      
      setBudgetWarningData({
        exceedAmount,
        newTotalAllocated: budget,
        newMaxBudget
      });
    } else if (budget <= (maxBudget || 0)) {
      // Hide warning if budget is now within limits
      setBudgetWarningData(null);
    }
  }, [budgetAmount, maxBudget]);

  // Generate default description and set default budget when component opens
  useEffect(() => {
    if (isOpen && !profileLoading) {
      // Set default budget amount
      setBudgetAmount(maxBudget?.toString() || '');
      
      // Generate default description with user metadata
      const styleText = style ? `${style} style` : 'elegant style';
      const cityText = weddingLocation ? `in ${weddingLocation}` : 'in your chosen city';
      const venueText = selectedVenueMetadata?.name ? `at ${selectedVenueMetadata.name}` : 'at your chosen venue';
      const dateText = userWeddingDate ? `on ${new Date(userWeddingDate).toLocaleDateString()}` : 'on your wedding date';
      const guestText = guestCount ? `for ${guestCount} guests` : 'for your guest count';
      
      const defaultDescription = `Budget breakdown for a ${styleText} wedding ${cityText} ${venueText} ${dateText} ${guestText}`;
      setDescription(defaultDescription);
      
      inputRef.current?.focus();
    }
  }, [isOpen, maxBudget, style, weddingLocation, selectedVenueMetadata, userWeddingDate, guestCount, profileLoading]);

  // Update budget amount when maxBudget changes
  useEffect(() => {
    if (maxBudget) {
      setBudgetAmount(maxBudget.toString());
    }
  }, [maxBudget]);

  const performGeneration = useCallback(async () => {
    // Prevent multiple simultaneous generations
    if (isGenerating) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Generation already in progress, skipping duplicate call');
      }
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setHasCreditError(false);
    
    
    // Close the AI Budget Assistant modal immediately to avoid modal over modal
    onClose();
    
    // Immediately trigger the progress modal
    setIsCreatingBudget(true); // Set to true immediately
    setBudgetCreationProgress({ // Initialize progress immediately
      current: 0,
      total: 20, // Estimate based on typical budget categories
      currentItem: 'Generating your budget with AI...'
    });
    
    try {
      
      try {
        const budgetResponse = await generateBudget({
          description,
          totalBudget: parseFloat(budgetAmount) || 0,
          weddingDate: userWeddingDate?.toISOString() || new Date().toISOString(),
          budgetType: 'comprehensive'
        });
        
        // Process the RAG response directly instead of calling the old API
        if (budgetResponse.success && budgetResponse.budget) {
          
          // Transform RAG response to match expected format
          const transformedBudget = {
            categories: budgetResponse.budget.categories.map((category: any) => {
              const color = getCategoryColor(category.name);
              return {
                name: category.name,
                allocatedAmount: category.amount || 0,
                color: color,
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
              };
            })
          };
          
           // Call createBudgetFromAI directly with the transformed RAG response
           await onGenerateBudget(description, parseFloat(budgetAmount) || 0);
           
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
        }
      
    } catch (error: any) {
      console.error('Error generating budget:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [description, budgetAmount, userWeddingDate, generateBudget, onGenerateBudget, onCreditError, onClose, setIsCreatingBudget, setBudgetCreationProgress, isGenerating]);

  const handleGenerate = useCallback(async () => {
    if (!description.trim() || !canSubmit || isGenerating) return;
    
    // If there's a budget warning, automatically update max budget
    if (budgetWarningData && updateUserMaxBudget) {
      await updateUserMaxBudget(budgetWarningData.newMaxBudget);
    }
    
    await performGeneration();
  }, [description, canSubmit, budgetWarningData, updateUserMaxBudget, performGeneration, isGenerating]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit && !isGenerating) {
      e.preventDefault();
      handleGenerate();
    }
  }, [canSubmit, handleGenerate, isGenerating]);

  // Helper function to get category color - matches DEFAULT_CATEGORIES exactly
  const getCategoryColor = (categoryName: string): string => {
    const colorMap: { [key: string]: string } = {
      'Venue & Location': '#A85C36',
      'Venue & Catering': '#A85C36', // RAG API uses this name
      'Catering & Food': '#8B4513',
      'Photography & Video': '#2F4F4F',
      'Photography & Videography': '#2F4F4F', // RAG API uses this name
      'Attire & Accessories': '#8A2BE2',
      'Attire & Beauty': '#8A2BE2', // RAG API uses this name
      'Flowers & Decor': '#FF69B4',
      'Flowers & Decorations': '#FF69B4', // RAG API uses this name
      'Music & Entertainment': '#32CD32',
      'Transportation': '#4169E1',
      'Wedding Rings': '#FFD700',
      'Stationery & Paper': '#DC143C',
      'Stationery & Favors': '#DC143C', // RAG API uses this name
      'Beauty & Health': '#FF1493',
      'Wedding Planner': '#00CED1',
      'Miscellaneous': '#696969'
    };
    
    // Try exact match first
    if (colorMap[categoryName]) {
      return colorMap[categoryName];
    }
    
    // Try partial matches for common variations
    for (const [key, color] of Object.entries(colorMap)) {
      if (categoryName.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(categoryName.toLowerCase())) {
        return color;
      }
    }
    
    // Default color
    return '#696969';
  };


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
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header row with title and close button */}
          <div className="flex items-center justify-between mb-4">
            <h5 className="h5 text-left flex-1">AI Budget Assistant</h5>
            <button
              onClick={onClose}
              className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full ml-4"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Description of what Paige will do */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">What Paige will do:</p>
                <p>
                  I'll analyze your wedding details and create a comprehensive budget breakdown with realistic categories, 
                  cost estimates, and personalized recommendations based on your location, style, and guest count.
                </p>
              </div>
            </div>
          </div>

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
              
              {/* Budget Warning Banner */}
              {budgetWarningData && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Are you sure?</p>
                      <p>
                        Your budget of ${budgetWarningData.newTotalAllocated.toLocaleString()} exceeds your current max budget by ${budgetWarningData.exceedAmount.toLocaleString()}. 
                        Max budget will be increased to ${budgetWarningData.newMaxBudget.toLocaleString()} by clicking Generate.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
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

              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="btn-primaryinverse px-4 py-2 text-sm"
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!canSubmit}
                  className="btn-primary px-6 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate (5 Credits)
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
