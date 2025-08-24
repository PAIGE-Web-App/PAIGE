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
    <p className="text-[#6B7280] mb-2">You haven't added any budget categories yet!</p>
    <p className="text-sm text-[#6B7280] mb-6">Get started with Paige AI or add categories.</p>
    
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        onClick={onShowAIAssistant}
        className="btn-primary flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Create Budget with Paige AI
      </button>
      <button
        onClick={onAddCategory}
        className="btn-inverse-primary"
      >
        Add New Category
      </button>
    </div>
  </div>
));

CategoryBreakdownEmptyState.displayName = 'CategoryBreakdownEmptyState';

export default CategoryBreakdownEmptyState;
