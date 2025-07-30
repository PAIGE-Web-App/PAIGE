import React, { useState } from 'react';
import { Plus, X, Edit3, FolderPlus } from 'lucide-react';

interface FloatingActionButtonProps {
  onAddItem: () => void;
  onAddCategory: () => void;
  selectedCategory: any;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onAddItem,
  onAddCategory,
  selectedCategory,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="lg:hidden fixed bottom-6 right-6 z-50">
      {/* Expanded Menu */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 mb-2 space-y-2">
          {/* Add Item Button */}
          <button
            onClick={() => {
              onAddItem();
              setIsExpanded(false);
            }}
            className="flex items-center gap-2 bg-[#A85C36] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[#8B4A2A] transition-colors"
            title="Add budget item"
          >
            <Edit3 className="w-4 h-4" />
            <span className="text-sm font-medium">Add Item</span>
          </button>

          {/* Add Category Button */}
          <button
            onClick={() => {
              onAddCategory();
              setIsExpanded(false);
            }}
            className="flex items-center gap-2 bg-[#332B42] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[#2A2335] transition-colors"
            title="Add category"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Category</span>
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-[#A85C36] text-white w-14 h-14 rounded-full shadow-lg hover:bg-[#8B4A2A] transition-all duration-200 flex items-center justify-center"
        title={isExpanded ? "Close menu" : "Quick actions"}
      >
        {isExpanded ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </button>
    </div>
  );
};

export default FloatingActionButton; 