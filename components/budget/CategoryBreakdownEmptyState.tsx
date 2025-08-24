import React from 'react';
import { Sparkles } from 'lucide-react';

interface CategoryBreakdownEmptyStateProps {
  onShowAIAssistant: () => void;
  onAddCategory: () => void;
}

const CategoryBreakdownEmptyState: React.FC<CategoryBreakdownEmptyStateProps> = React.memo(({
  onShowAIAssistant,
  onAddCategory
}) => (
  <div className="text-center py-8">
    <img 
      src="/Wedding%20Illustration.png" 
      alt="Wedding Illustration" 
      className="w-32 h-32 mx-auto mb-4 opacity-60"
    />
    <p className="text-gray-500 mb-2">You haven't added any budget categories yet!</p>
    <p className="text-sm text-gray-500 mb-6">Get started with Paige AI or add categories.</p>
    
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        onClick={onShowAIAssistant}
        className="btn-gradient-purple flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Create Budget with Paige
      </button>
      <button
        onClick={onAddCategory}
        className="btn-primaryinverse"
      >
        Add New Category
      </button>
    </div>
  </div>
));

CategoryBreakdownEmptyState.displayName = 'CategoryBreakdownEmptyState';

export default CategoryBreakdownEmptyState;
