import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  Edit2, 
  Trash2, 
  Link, 
  UserPlus, 
  DollarSign, 
  NotepadText,
  MoreHorizontal,
  CheckCircle,
  Circle
} from 'lucide-react';
import { BudgetItem } from '@/types/budget';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';
import { doc, setDoc } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { useBudgetItemEditing } from '@/hooks/useBudgetItemEditing';
import { useAnimationState } from '@/hooks/useAnimationState';
import EditableField from './common/EditableField';

interface BudgetItemComponentProps {
  budgetItem: BudgetItem;
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (item: BudgetItem) => void;
  onAssign?: (item: BudgetItem) => void;
  className?: string;
  isNewlyAdded?: boolean;
}

const BudgetItemComponent: React.FC<BudgetItemComponentProps> = ({
  budgetItem,
  onDeleteItem,
  onLinkVendor,
  onAssign,
  className = '',
  isNewlyAdded = false,
}) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // State for inline editing
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  
  // Use custom hooks for editing and animations
  const editing = useBudgetItemEditing({
    itemId: budgetItem.id!,
    initialValues: {
      name: budgetItem.name,
      amount: budgetItem.amount,
      notes: budgetItem.notes || ''
    }
  });
  
  const { isAnimating: showNewlyAdded } = useAnimationState({ 
    initialValue: isNewlyAdded 
  });

  // Refs
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Effect to manage click outside for "More" menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle newly added animation
  useEffect(() => {
    if (isNewlyAdded) {
      // Animation is handled by the hook
    }
  }, [isNewlyAdded]);

  // Memoized values for performance
  const formattedAmount = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budgetItem.amount);
  }, [budgetItem.amount]);

  const isOverBudget = useMemo(() => {
    // This could be enhanced with category data if needed
    return false;
  }, []);

  const triggerJustUpdated = (itemId: string) => {
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
  };

  const handleToggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMoreMenu((prev) => !prev);
  }, []);

  // Name editing handlers
  const handleNameDoubleClick = useCallback(() => {
    if (budgetItem.isCompleted) return;
    editing.startEditing('name', budgetItem.name);
  }, [budgetItem.name, budgetItem.isCompleted, editing]);

  const handleNameSave = useCallback(async (value: string) => {
    await editing.saveEdit(value);
    triggerJustUpdated(budgetItem.id!);
  }, [budgetItem.id, editing]);

  // Amount editing handlers
  const handleAmountClick = useCallback(() => {
    if (budgetItem.isCompleted) return;
    editing.startEditing('amount', budgetItem.amount);
  }, [budgetItem.amount, budgetItem.isCompleted, editing]);

  const handleAmountSave = useCallback(async (value: string) => {
    await editing.saveEdit(value);
    triggerJustUpdated(budgetItem.id!);
  }, [budgetItem.id, editing]);

  // Note editing handlers
  const handleAddNoteClick = useCallback(() => {
    if (budgetItem.isCompleted) return;
    editing.startEditing('notes', budgetItem.notes || '');
  }, [budgetItem.notes, budgetItem.isCompleted, editing]);

  const handleNoteSave = useCallback(async (value: string) => {
    await editing.saveEdit(value);
    triggerJustUpdated(budgetItem.id!);
  }, [budgetItem.id, editing]);



  return (
    <div
      className={`relative bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4 hover:border-[#A85C36] transition-colors ${
        justUpdated ? 'bg-green-100' : ''
      } ${showNewlyAdded ? 'bg-green-100' : ''} ${className}`}
    >
      {/* Header with name and more menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <EditableField
            value={budgetItem.name || 'New Budget Item (Click to Edit)'}
            isEditing={editing.editingField === 'name'}
            onStartEdit={handleNameDoubleClick}
            onSave={handleNameSave}
            onCancel={editing.cancelEdit}
            placeholder="Enter item name..."
            className={`text-sm font-medium text-[#332B42] ${
              budgetItem.isCompleted ? 'line-through text-gray-500' : ''
            }`}
            disabled={budgetItem.isCompleted}
            showEditIcon={false}
          />
        </div>
        
        {/* More menu */}
        <div className="relative ml-2" ref={moreMenuRef}>
          <button
            onClick={handleToggleMenu}
            className="p-1 text-[#AB9C95] hover:text-[#332B42] hover:bg-[#F3F2F0] rounded"
            title="More options"
          >
            <MoreHorizontal size={16} />
          </button>
          
          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-10 min-w-[120px]">
              <button
                onClick={() => onLinkVendor(budgetItem)}
                className="w-full text-left px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2"
              >
                <Link size={14} />
                Link Vendor
              </button>
              {onAssign && (
                <button
                  onClick={() => onAssign(budgetItem)}
                  className="w-full text-left px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2"
                >
                  <UserPlus size={14} />
                  Assign
                </button>
              )}
              <button
                onClick={() => onDeleteItem(budgetItem.id!)}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-[#F3F2F0] flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Amount section */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-[#A85C36]" />
          <EditableField
            value={budgetItem.amount.toString()}
            isEditing={editing.editingField === 'amount'}
            onStartEdit={handleAmountClick}
            onSave={handleAmountSave}
            onCancel={editing.cancelEdit}
            type="number"
            placeholder="0"
            className="text-sm font-semibold text-[#A85C36] w-24"
            disabled={budgetItem.isCompleted}
            showEditIcon={false}
          />
        </div>
      </div>

      {/* Vendor association */}
      {budgetItem.vendorName && (
        <div className="flex items-center gap-2 mb-2 text-sm text-[#AB9C95]">
          <Link size={14} />
          <span>{budgetItem.vendorName}</span>
        </div>
      )}

      {/* Notes section */}
      <div className="mt-2">
        <div className="flex items-start gap-1">
          <NotepadText size={14} className="text-[#364257] mt-0.5" />
          <EditableField
            value={budgetItem.notes || ''}
            isEditing={editing.editingField === 'notes'}
            onStartEdit={handleAddNoteClick}
            onSave={handleNoteSave}
            onCancel={editing.cancelEdit}
            type="textarea"
            placeholder="+ Add Note"
            className="text-xs text-[#364257]"
            disabled={budgetItem.isCompleted}
            showEditIcon={false}
          />
        </div>
      </div>

      {/* Action links */}
      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-[#E0DBD7] text-xs">
        <button
          onClick={() => onLinkVendor(budgetItem)}
          className="text-[#A85C36] hover:text-[#8B4513] underline"
        >
          Link Vendor
        </button>
        {onAssign && (
          <button
            onClick={() => onAssign(budgetItem)}
            className="text-[#A85C36] hover:text-[#8B4513] underline flex items-center gap-1"
          >
            <UserPlus size={12} />
            Assign
          </button>
        )}
      </div>

      {/* Completion status */}
      {budgetItem.isCompleted && (
        <div className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
          <CheckCircle size={12} />
          Completed
        </div>
      )}
    </div>
  );
};

export default BudgetItemComponent; 