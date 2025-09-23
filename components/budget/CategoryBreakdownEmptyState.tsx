import React, { useState, useEffect } from 'react';
import PrePopulatedBudgetCategoriesModal from './PrePopulatedBudgetCategoriesModal';

interface CategoryBreakdownEmptyStateProps {
  onShowAIAssistant: () => void;
  onAddCategory: () => void;
  onAddMultipleCategories?: (categories: Array<{name: string; amount: number; items?: Array<{name: string; amount: number; notes?: string; dueDate?: Date}>}>) => void;
  maxBudget?: number;
}

const CategoryBreakdownEmptyState: React.FC<CategoryBreakdownEmptyStateProps> = React.memo(({
  onShowAIAssistant,
  onAddCategory,
  onAddMultipleCategories,
  maxBudget
}) => {
  const [showPrePopulatedModal, setShowPrePopulatedModal] = useState(false);

  // Always show modal when there are 0 categories
  useEffect(() => {
    // Show modal after a short delay to let the page load
    const timer = setTimeout(() => {
      setShowPrePopulatedModal(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle dismissing pre-populated categories
  const handleDismissPrePopulated = () => {
    setShowPrePopulatedModal(false);
  };

  // Handle adding multiple categories
  const handleAddMultipleCategories = (categories: Array<{name: string; amount: number; items?: Array<{name: string; amount: number; notes?: string; dueDate?: Date}>}>) => {
    if (onAddMultipleCategories) {
      onAddMultipleCategories(categories);
    } else {
      // Fallback to adding one by one
      categories.forEach(category => {
        onAddCategory();
        // Note: We can't set the name and amount with the current onAddCategory function
        // This would need to be updated in the parent component
      });
    }
  };

  return (
    <div>
      <PrePopulatedBudgetCategoriesModal
        isOpen={showPrePopulatedModal}
        onClose={handleDismissPrePopulated}
        onAddCategories={handleAddMultipleCategories}
        onShowAIAssistant={onShowAIAssistant}
        maxBudget={maxBudget}
      />
      
      <div className="text-center py-8">
        <img 
          src="/Wedding%20Illustration.png" 
          alt="Wedding Illustration" 
          className="w-32 h-32 mx-auto mb-4 opacity-60"
        />
        <p className="text-gray-500 mb-2">You haven't added any budget categories yet!</p>
        <p className="text-sm text-gray-500">Use the buttons above to get started with Paige AI or add categories.</p>
      </div>
    </div>
  );
});

CategoryBreakdownEmptyState.displayName = 'CategoryBreakdownEmptyState';

export default CategoryBreakdownEmptyState;
