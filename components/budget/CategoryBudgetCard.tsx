import React from 'react';

interface CategoryBudgetCardProps {
  categoryName: string;
  allocatedAmount: number;
  totalSpent: number;
  remaining: number;
  onEdit: () => void;
  className?: string;
}

export const CategoryBudgetCard: React.FC<CategoryBudgetCardProps> = ({
  categoryName,
  allocatedAmount,
  totalSpent,
  remaining,
  onEdit,
  className = ''
}) => {
  return (
    <div className={`bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4 h-40 w-full relative ${className}`}>
      <h3 className="text-sm font-medium text-[#AB9C95] mb-2">{categoryName}</h3>
      
      <div className="text-lg font-bold text-[#332B42] mb-1">
        ${allocatedAmount.toLocaleString()}
      </div>
      
      <div className="text-sm text-[#AB9C95] mb-2">
        Budget allocated to this category
      </div>
      
      <div className="text-xs text-[#AB9C95]">
        ${totalSpent.toLocaleString()} spent • ${remaining.toLocaleString()} remaining
      </div>
      
      <button
        onClick={onEdit}
        className="absolute top-3 right-3 p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors"
        title="Edit category budget"
      >
        <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
          ✏️
        </span>
      </button>
    </div>
  );
};
