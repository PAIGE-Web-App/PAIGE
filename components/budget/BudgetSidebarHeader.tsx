import React from 'react';

interface BudgetSidebarHeaderProps {
  onAddCategory: () => void;
}

const BudgetSidebarHeader: React.FC<BudgetSidebarHeaderProps> = ({ onAddCategory }) => {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[#AB9C95] bg-[#F3F2F0] sticky top-0 z-10">
      <h4 className="text-lg font-playfair font-medium text-[#332B42] flex items-center">
        Budget Categories
      </h4>
      <button
        onClick={onAddCategory}
        className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] ml-auto"
        title="Add a new category"
      >
        + New Category
      </button>
    </div>
  );
};

export default BudgetSidebarHeader; 