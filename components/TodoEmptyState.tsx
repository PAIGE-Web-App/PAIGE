import React, { useState, useEffect } from 'react';
import TodoTemplatesModal from './TodoTemplatesModal';

interface TodoEmptyStateProps {
  onSelectTemplate: (template: any, allowAIDeadlines?: boolean) => void;
  onCreateWithAI: () => void;
}

const TodoEmptyState: React.FC<TodoEmptyStateProps> = React.memo(({
  onSelectTemplate,
  onCreateWithAI
}) => {
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Always show modal when there are 0 todo lists
  useEffect(() => {
    // Show modal after a short delay to let the page load
    const timer = setTimeout(() => {
      setShowTemplatesModal(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle dismissing templates modal
  const handleDismissTemplates = () => {
    setShowTemplatesModal(false);
  };

  // Handle template selection
  const handleTemplateSelection = (template: any, allowAIDeadlines?: boolean) => {
    onSelectTemplate(template, allowAIDeadlines);
    setShowTemplatesModal(false);
  };

  // Handle AI creation
  const handleCreateWithAI = () => {
    onCreateWithAI();
    setShowTemplatesModal(false);
  };

  return (
    <div>
      <TodoTemplatesModal
        isOpen={showTemplatesModal}
        onClose={handleDismissTemplates}
        onSelectTemplate={handleTemplateSelection}
        onCreateWithAI={handleCreateWithAI}
      />
      
      <div className="flex flex-col items-center justify-center text-center h-full min-h-[400px] py-8">
        <img src="/todo.png" alt="Empty To-do List" className="w-24 h-24 mb-6 opacity-70" />
        <div className="max-w-md">
          <h3 className="text-base font-medium text-gray-800 mb-3">Start organizing your wedding to-do items</h3>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Wedding planning involves hundreds of details and deadlines. Paige helps you stay organized with smart to-do lists that adapt to your timeline and automatically suggest the right items at the right time.
          </p>
          <p className="text-sm text-gray-500 font-medium mb-4">Choose a template to get started!</p>
          <div className="flex justify-center">
            <button 
              onClick={() => setShowTemplatesModal(true)}
              className="btn-primary"
            >
              Choose Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

TodoEmptyState.displayName = 'TodoEmptyState';

export default TodoEmptyState;
