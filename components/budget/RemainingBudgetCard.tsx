import React, { useState, useRef, useEffect } from 'react';
import { Edit, Check, X } from 'lucide-react';

interface RemainingBudgetCardProps {
  remaining: number;
  maxBudget: number;
  onEdit?: () => void;
  onUpdateMaxBudget?: (newAmount: number) => void;
  className?: string;
}

export const RemainingBudgetCard: React.FC<RemainingBudgetCardProps> = ({
  remaining,
  maxBudget,
  onEdit,
  onUpdateMaxBudget,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(maxBudget.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isUnderBudget = remaining > 0;

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
    <div className={`border border-[#E0DBD7] rounded-[5px] p-4 bg-white min-h-40 w-full relative flex flex-col ${className}`}>
      <h3 className="text-xs font-normal text-[#332B42] mb-2 font-work">Remaining Budget</h3>
      
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-lg font-bold text-[#332B42] mb-1">
          ${remaining.toLocaleString()}
        </div>
        
        {isEditing ? (
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs text-[#AB9C95]">/ $</span>
            <input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-20 text-center text-xs text-[#AB9C95] bg-white border border-[#A85C36] rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-[#A85C36]"
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
          <div className="text-xs text-[#AB9C95] mb-2">
            / ${maxBudget.toLocaleString()}
          </div>
        )}
        
        <div className={`text-xs ${isUnderBudget ? 'text-green-600' : 'text-red-600'}`}>
          {isUnderBudget ? 'On track' : 'Over budget'}
        </div>
      </div>
      
      {!isEditing && (onUpdateMaxBudget || onEdit) && (
        <button
          onClick={onUpdateMaxBudget ? handleEdit : onEdit}
          className="absolute top-3 right-3 p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors"
          title={onUpdateMaxBudget ? "Edit max budget" : "Update in settings"}
        >
          <Edit className="w-3 h-3 text-[#AB9C95]" />
        </button>
      )}
    </div>
  );
};
