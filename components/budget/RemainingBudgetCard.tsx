import React from 'react';

interface RemainingBudgetCardProps {
  remaining: number;
  maxBudget: number;
  onEdit: () => void;
  className?: string;
}

export const RemainingBudgetCard: React.FC<RemainingBudgetCardProps> = ({
  remaining,
  maxBudget,
  onEdit,
  className = ''
}) => {
  const isUnderBudget = remaining > 0;
  
  return (
    <div className={`border border-[#E0DBD7] rounded-[5px] p-4 bg-white min-h-40 w-full relative flex flex-col ${className}`}>
      <h3 className="text-xs font-normal text-[#332B42] mb-2 font-work">Remaining Budget</h3>
      
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-lg font-bold text-[#332B42] mb-1">
          ${remaining.toLocaleString()}
        </div>
        
        <div className="text-xs text-[#AB9C95] mb-2">
          / ${maxBudget.toLocaleString()}
        </div>
        
        <div className={`text-xs ${isUnderBudget ? 'text-green-600' : 'text-red-600'}`}>
          {isUnderBudget ? 'On track' : 'Over budget'}
        </div>
      </div>
      
      <button
        onClick={onEdit}
        className="absolute top-3 right-3 p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors"
        title="Update in settings"
      >
        <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
          ✏️
        </span>
      </button>
    </div>
  );
};
