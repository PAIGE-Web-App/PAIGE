import React from 'react';

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
    <p className="text-sm text-gray-500">Use the buttons above to get started with Paige AI or add categories.</p>
  </div>
));

CategoryBreakdownEmptyState.displayName = 'CategoryBreakdownEmptyState';

export default CategoryBreakdownEmptyState;
