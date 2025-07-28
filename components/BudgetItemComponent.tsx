import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(budgetItem.name);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editingAmountValue, setEditingAmountValue] = useState(budgetItem.amount.toString());
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteValue, setEditingNoteValue] = useState(budgetItem.notes || '');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [showNewlyAdded, setShowNewlyAdded] = useState(isNewlyAdded);

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

  // Autofocus inputs when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingAmount && amountInputRef.current) {
      amountInputRef.current.focus();
    }
  }, [isEditingAmount]);

  // Handle newly added animation
  useEffect(() => {
    if (isNewlyAdded) {
      setShowNewlyAdded(true);
      const timer = setTimeout(() => setShowNewlyAdded(false), 1000); // Flash for 1 second (same as justUpdated)
      return () => clearTimeout(timer);
    }
  }, [isNewlyAdded]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
    setIsEditingName(true);
    setEditingNameValue(budgetItem.name);
  }, [budgetItem.name, budgetItem.isCompleted]);

  const handleNameBlur = useCallback(async () => {
    if (editingNameValue.trim() !== budgetItem.name) {
      if (!editingNameValue.trim()) {
        showErrorToast('Item name cannot be empty.');
        setEditingNameValue(budgetItem.name);
      } else {
        await handleUpdateName(budgetItem.id!, editingNameValue.trim());
        triggerJustUpdated(budgetItem.id!);
      }
    }
    setIsEditingName(false);
  }, [editingNameValue, budgetItem.id, budgetItem.name]);

  const handleNameKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingNameValue(budgetItem.name);
      setIsEditingName(false);
      e.currentTarget.blur();
    }
  }, [budgetItem.name]);

  // Amount editing handlers
  const handleAmountClick = useCallback(() => {
    if (budgetItem.isCompleted) return;
    setIsEditingAmount(true);
    setEditingAmountValue(budgetItem.amount.toString());
  }, [budgetItem.amount, budgetItem.isCompleted]);

  const handleAmountBlur = useCallback(async () => {
    const newAmount = parseFloat(editingAmountValue) || 0;
    if (newAmount !== budgetItem.amount) {
      await handleUpdateAmount(budgetItem.id!, newAmount);
      triggerJustUpdated(budgetItem.id!);
    }
    setIsEditingAmount(false);
  }, [editingAmountValue, budgetItem.id, budgetItem.amount]);

  const handleAmountKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingAmountValue(budgetItem.amount.toString());
      setIsEditingAmount(false);
      e.currentTarget.blur();
    }
  }, [budgetItem.amount]);

  // Note editing handlers
  const handleAddNoteClick = useCallback(() => {
    if (budgetItem.isCompleted) return;
    setIsEditingNote(true);
    setEditingNoteValue(budgetItem.notes || '');
  }, [budgetItem.notes, budgetItem.isCompleted]);

  const handleUpdateNoteClick = useCallback(async () => {
    await handleUpdateNote(budgetItem.id!, editingNoteValue);
    setIsEditingNote(false);
  }, [budgetItem.id, editingNoteValue]);

  const handleNoteKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      await handleUpdateNote(budgetItem.id!, editingNoteValue);
      setIsEditingNote(false);
    } else if (e.key === 'Escape') {
      setEditingNoteValue(budgetItem.notes || '');
      setIsEditingNote(false);
      e.currentTarget.blur();
    }
  }, [budgetItem.id, budgetItem.notes, editingNoteValue]);

  const handleNoteCancel = useCallback(() => {
    setEditingNoteValue(budgetItem.notes || '');
    setIsEditingNote(false);
  }, [budgetItem.notes]);

  const handleNoteBlur = useCallback(async () => {
    if (editingNoteValue !== budgetItem.notes) {
      await handleUpdateNote(budgetItem.id!, editingNoteValue);
      triggerJustUpdated(budgetItem.id!);
    }
    setIsEditingNote(false);
  }, [editingNoteValue, budgetItem.id, budgetItem.notes]);

  // Update handlers
  const handleUpdateName = async (itemId: string, newName: string) => {
    if (!user) {
      showErrorToast('User not authenticated.');
      return;
    }
    try {
      const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), itemId);
      await setDoc(itemRef, { name: newName, updatedAt: new Date() }, { merge: true });
      showSuccessToast('Item name updated!');
    } catch (error: any) {
      console.error('Error updating item name:', error);
      showErrorToast(`Failed to update item name: ${error.message}`);
    }
  };

  const handleUpdateAmount = async (itemId: string, newAmount: number) => {
    if (!user) {
      showErrorToast('User not authenticated.');
      return;
    }
    try {
      const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), itemId);
      await setDoc(itemRef, { amount: newAmount, updatedAt: new Date() }, { merge: true });
      showSuccessToast('Amount updated!');
    } catch (error: any) {
      console.error('Error updating amount:', error);
      showErrorToast(`Failed to update amount: ${error.message}`);
    }
  };

  const handleUpdateNote = async (itemId: string, newNote: string) => {
    if (!user) {
      showErrorToast('User not authenticated.');
      return;
    }
    try {
      const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), itemId);
      await setDoc(itemRef, { notes: newNote, updatedAt: new Date() }, { merge: true });
      showSuccessToast(`Note ${newNote ? 'updated' : 'removed'}!`);
    } catch (error: any) {
      console.error('Error updating note:', error);
      showErrorToast(`Failed to update note: ${error.message}`);
    }
  };

  return (
    <div
      className={`relative bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4 hover:border-[#A85C36] transition-colors ${
        justUpdated ? 'bg-green-100' : ''
      } ${showNewlyAdded ? 'bg-green-100' : ''} ${className}`}
    >
      {/* Header with name and more menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editingNameValue}
              onChange={(e) => setEditingNameValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="w-full text-sm font-medium text-[#332B42] border border-[#AB9C95] rounded-[3px] px-2 py-1 focus:outline-none focus:border-[#A85C36]"
              autoFocus
            />
          ) : (
            <div
              onDoubleClick={handleNameDoubleClick}
              className={`text-sm font-medium text-[#332B42] cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5 ${
                budgetItem.isCompleted ? 'line-through text-gray-500' : ''
              }`}
              title={budgetItem.isCompleted ? 'Mark as incomplete to edit' : 'Double-click to edit'}
            >
              {budgetItem.name || 'New Budget Item (Click to Edit)'}
            </div>
          )}
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
        {isEditingAmount ? (
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-[#A85C36]" />
            <input
              ref={amountInputRef}
              type="number"
              value={editingAmountValue}
              onChange={(e) => setEditingAmountValue(e.target.value)}
              onBlur={handleAmountBlur}
              onKeyDown={handleAmountKeyDown}
              className="text-sm font-semibold text-[#A85C36] border border-[#AB9C95] rounded-[3px] px-2 py-1 focus:outline-none focus:border-[#A85C36] w-24"
              min="0"
              step="0.01"
              autoFocus
            />
            <button
              onClick={handleAmountBlur}
              className="btn-primary text-xs px-2 py-1"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingAmountValue(budgetItem.amount.toString());
                setIsEditingAmount(false);
              }}
              className="btn-primaryinverse text-xs px-2 py-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div
            onClick={handleAmountClick}
            className="flex items-center gap-2 cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5"
            title={budgetItem.isCompleted ? 'Mark as incomplete to edit' : 'Click to edit amount'}
          >
            <DollarSign size={16} className="text-[#A85C36]" />
            <span className="text-sm font-semibold text-[#A85C36]">
              {formatCurrency(budgetItem.amount)}
            </span>
          </div>
        )}
      </div>

      {/* Vendor association */}
      {budgetItem.vendorName && (
        <div className="flex items-center gap-2 mb-2 text-sm text-[#AB9C95]">
          <Link size={14} />
          <span>{budgetItem.vendorName}</span>
        </div>
      )}

      {/* Notes section */}
      {isEditingNote ? (
        <div className="mt-2">
          <textarea
            value={editingNoteValue}
            onChange={(e) => setEditingNoteValue(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            onBlur={handleNoteBlur}
            onKeyDown={handleNoteKeyDown}
            className="w-full text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-2 py-1 focus:outline-none focus:border-[#A85C36]"
            autoFocus
          />
          <div className="flex gap-2 mt-1">
            <button onClick={handleUpdateNoteClick} className="btn-primary text-xs px-2 py-1">
              Update
            </button>
            <button onClick={handleNoteCancel} className="btn-primaryinverse text-xs px-2 py-1">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="flex items-start gap-1 mt-2 cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5"
          onClick={handleAddNoteClick}
        >
          <NotepadText size={14} className="text-[#364257] mt-0.5" />
          <span className="text-xs text-[#364257]">
            {budgetItem.notes || '+ Add Note'}
          </span>
        </div>
      )}

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