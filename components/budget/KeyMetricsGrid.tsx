import React, { useState, useRef, useEffect } from 'react';
import { Edit, Check, X } from 'lucide-react';
import InfoTooltip from './InfoTooltip';

interface KeyMetricsGridProps {
  maxBudget: number;
  totalSpent: number;
  totalRemaining: number;
  budgetUtilization: number;
  isOverBudget: boolean;
  projectedSpend: number;
  budgetFlexibility: number;
  formatCurrency: (amount: number) => string;
  onUpdateMaxBudget?: (newAmount: number) => void;
}

const KeyMetricsGrid: React.FC<KeyMetricsGridProps> = React.memo(({
  maxBudget,
  totalSpent,
  totalRemaining,
  budgetUtilization,
  isOverBudget,
  projectedSpend,
  budgetFlexibility,
  formatCurrency,
  onUpdateMaxBudget
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(maxBudget.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(maxBudget.toString());
  };

  const handleSave = () => {
    const newAmount = parseFloat(editValue);
    if (!isNaN(newAmount) && newAmount >= 0 && onUpdateMaxBudget) {
      onUpdateMaxBudget(newAmount);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(maxBudget.toString());
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Handle click away to save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        handleSave();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, editValue]);

  return (
  <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
    <div className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center relative">
      {isEditing ? (
        <div className="flex items-center justify-center gap-1">
          <span className="text-sm text-[#6B7280]">$</span>
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-24 text-center text-sm font-medium text-[#332B42] bg-white border border-[#A85C36] rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
            autoFocus
            min="0"
            step="100"
          />
          <button
            onClick={handleSave}
            className="text-green-600 hover:text-green-700 p-1"
            title="Save changes"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            className="text-red-600 hover:text-red-700 p-1"
            title="Cancel editing"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <div className="text-lg font-medium text-[#332B42]">{formatCurrency(maxBudget)}</div>
          <div className="text-sm text-[#6B7280]">Max Budget</div>
          {onUpdateMaxBudget && (
            <button
              onClick={handleEdit}
              className="absolute top-2 right-2 text-[#A85C36] hover:text-[#8B4513] transition-colors p-1"
              title="Edit max budget"
            >
              <Edit className="w-3 h-3" />
            </button>
          )}
        </>
      )}
    </div>
    <div className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center relative">
      <div className={`text-lg font-medium ${isOverBudget ? 'text-red-600' : 'text-[#332B42]'}`}>
        {formatCurrency(totalSpent)}
      </div>
                  <div className="text-sm text-[#6B7280] flex items-center justify-center gap-1">
                    Total Spent Amount
                    <InfoTooltip content="Sum of all Spent Amounts across all budget items" />
                  </div>
    </div>
    <div className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center">
      <div className={`text-lg font-medium ${totalRemaining < 0 ? 'text-red-600' : 'text-[#16A34A]'}`}>
        {formatCurrency(Math.abs(totalRemaining))}
      </div>
      <div className="text-sm text-[#6B7280]">
        {totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}
      </div>
    </div>
    <div className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center">
      <div className={`text-lg font-medium ${budgetUtilization > 100 ? 'text-red-600' : 'text-[#332B42]'}`}>
        {budgetUtilization.toFixed(1)}%
      </div>
      <div className="text-sm text-[#6B7280]">Utilized</div>
    </div>
    <div className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center relative">
      <div className="text-lg font-medium text-[#332B42]">{formatCurrency(projectedSpend)}</div>
      <div className="text-sm text-[#6B7280] flex items-center justify-center gap-1">
        Projected Spend
        <InfoTooltip content="Sum of all projected amounts across all budget categories" />
      </div>
    </div>
    <div className="bg-[#F8F6F4] p-4 rounded-[8px] border border-[#E0DBD7] text-center relative">
      <div className={`text-lg font-medium ${budgetFlexibility < 0 ? 'text-red-600' : 'text-[#16A34A]'}`}>
        {budgetFlexibility < 0 ? formatCurrency(budgetFlexibility) : formatCurrency(Math.abs(budgetFlexibility))}
      </div>
      <div className="text-sm text-[#6B7280] flex items-center justify-center gap-1">
        Flexibility
        <InfoTooltip 
          content={budgetFlexibility >= 0 
            ? 'Max Budget minus Projected Spend (available to allocate)'
            : 'Projected Spend exceeds Max Budget (negative flexibility)'
          } 
        />
      </div>
    </div>
  </div>
  );
});

KeyMetricsGrid.displayName = 'KeyMetricsGrid';

export default KeyMetricsGrid;
