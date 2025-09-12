import React from 'react';

interface BudgetMetricsCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  editButton?: {
    onClick: () => void;
    title: string;
  };
}

export const BudgetMetricsCard: React.FC<BudgetMetricsCardProps> = ({
  title,
  children,
  className = '',
  editButton
}) => {
  return (
    <div className={`border border-[#E0DBD7] rounded-[5px] p-4 bg-white min-h-40 w-full relative flex flex-col ${className}`}>
      <h3 className="text-xs font-normal text-[#332B42] mb-2 font-work">{title}</h3>
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      {editButton && (
        <button
          onClick={editButton.onClick}
          className="absolute top-3 right-3 p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors"
          title={editButton.title}
        >
          <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
            ✏️
          </span>
        </button>
      )}
    </div>
  );
};
