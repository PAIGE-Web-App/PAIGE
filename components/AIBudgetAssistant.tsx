import React, { useState } from 'react';
import { X, Sparkles, DollarSign, ClipboardList, Zap } from 'lucide-react';

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

  const handleGenerate = async () => {
    if (!description.trim()) return;
    
    console.log('AI Budget Assistant - Starting generation:', {
      selectedOption,
      description,
      budgetAmount,
      isGenerating
    });
    
    setIsGenerating(true);
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
    } catch (error) {
      console.error('Error generating:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-[5px] p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#332B42] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#A85C36]" />
            AI Budget Assistant
          </h2>
          <button
            onClick={onClose}
            className="text-[#AB9C95] hover:text-[#332B42]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0]"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIBudgetAssistant; 