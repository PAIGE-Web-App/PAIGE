import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, DollarSign, ClipboardList, Zap, AlertTriangle } from 'lucide-react';

interface AIBudgetAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateBudget: (description: string, totalBudget: number) => void;
  onGenerateTodoList: (description: string) => void;
  onGenerateIntegratedPlan: (description: string, totalBudget: number) => void;
  weddingDate: Date | null;
  totalBudget: number | null;
}

const AIBudgetAssistant: React.FC<AIBudgetAssistantProps> = ({
  isOpen,
  onClose,
  onGenerateBudget,
  onGenerateTodoList,
  onGenerateIntegratedPlan,
  weddingDate,
  totalBudget,
}) => {
  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState(totalBudget?.toString() || '');
  const [selectedOption, setSelectedOption] = useState<'budget' | 'todo' | 'integrated'>('integrated');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    
    console.log('AI Budget Assistant - handleGenerate called:', {
      selectedOption,
      hasExistingBudget: totalBudget && totalBudget > 0,
      totalBudget
    });
    
    // Show overwrite warning for budget-related options if user has existing budget
    if ((selectedOption === 'budget' || selectedOption === 'integrated') && totalBudget && totalBudget > 0) {
      console.log('Showing overwrite warning');
      setShowOverwriteWarning(true);
      return;
    }
    
    await performGeneration();
  };

  const performGeneration = async () => {
    console.log('AI Budget Assistant - Starting generation:', {
      selectedOption,
      description,
      budgetAmount,
      isGenerating
    });
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const budget = parseFloat(budgetAmount) || 0;
      
      switch (selectedOption) {
        case 'budget':
          console.log('Generating budget only...');
          await onGenerateBudget(description, budget);
          break;
        case 'todo':
          console.log('Redirecting to todo page...');
          // For todo-only generation, use your existing todo system
          // This will redirect to the todo page with AI generation
          window.location.href = '/todo?ai-generate=true&description=' + encodeURIComponent(description);
          break;
        case 'integrated':
          console.log('Generating integrated plan...');
          await onGenerateIntegratedPlan(description, budget);
          break;
      }
      
      console.log('Generation completed successfully');
      onClose();
    } catch (error: any) {
      console.error('Error generating:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose} // Close modal when clicking outside
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
          onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <h5 className="h5 mb-4 text-center flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-[#A85C36]" />
            AI Budget Assistant
          </h5>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              What would you like to create?
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setSelectedOption('integrated')}
                className={`p-3 border rounded-[5px] text-left transition-colors ${
                  selectedOption === 'integrated'
                    ? 'border-[#A85C36] bg-[#F8F6F4]'
                    : 'border-[#AB9C95] hover:border-[#A85C36]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#A85C36]" />
                  <div>
                    <div className="font-medium text-[#332B42]">Integrated Plan</div>
                    <div className="text-xs text-[#AB9C95]">Budget + Todo list together</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedOption('budget')}
                className={`p-3 border rounded-[5px] text-left transition-colors ${
                  selectedOption === 'budget'
                    ? 'border-[#A85C36] bg-[#F8F6F4]'
                    : 'border-[#AB9C95] hover:border-[#A85C36]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#A85C36]" />
                  <div>
                    <div className="font-medium text-[#332B42]">Budget Only</div>
                    <div className="text-xs text-[#AB9C95]">Just the budget breakdown</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedOption('todo')}
                className={`p-3 border rounded-[5px] text-left transition-colors ${
                  selectedOption === 'todo'
                    ? 'border-[#A85C36] bg-[#F8F6F4]'
                    : 'border-[#AB9C95] hover:border-[#A85C36]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#A85C36]" />
                  <div>
                    <div className="font-medium text-[#332B42]">Todo List Only</div>
                    <div className="text-xs text-[#AB9C95]">Just the task list</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              Describe your wedding vision
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
              placeholder="e.g., Intimate garden wedding for 50 guests in California with rustic charm..."
              rows={4}
            />
          </div>

          {(selectedOption === 'budget' || selectedOption === 'integrated') && (
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-1">
                Total Budget
              </label>
              <input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm focus:outline-none focus:border-[#A85C36]"
                placeholder="25000"
                min="0"
                step="100"
              />
            </div>
          )}

          {!weddingDate && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-[5px]">
              <p className="text-sm text-yellow-800">
                💡 For better results, set your wedding date in settings to get more accurate timelines.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[5px]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Generation Failed</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs text-red-600 hover:text-red-800 mt-2 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center w-full mt-6 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0]"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {/* Overwrite Warning Modal */}
        {showOverwriteWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
            onClick={() => setShowOverwriteWarning(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#332B42]">Overwrite Existing Budget?</h3>
                  <p className="text-sm text-[#AB9C95]">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-sm text-[#332B42] mb-6">
                You currently have a budget of ${totalBudget?.toLocaleString()}. 
                {selectedOption === 'integrated' 
                  ? ' This will create a new budget AND todo list, replacing your current budget.'
                  : ' This will create a new budget, replacing your current one.'
                }
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowOverwriteWarning(false)}
                  className="px-4 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowOverwriteWarning(false);
                    performGeneration();
                  }}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIBudgetAssistant; 