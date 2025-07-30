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
import TodoAssignmentModal from './TodoAssignmentModal';
import UserAvatar from './UserAvatar';
import { useUserProfileData } from '@/hooks/useUserProfileData';

interface BudgetItemComponentProps {
  budgetItem: BudgetItem;
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (item: BudgetItem) => void;
  onAssign?: (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[], itemId: string) => Promise<void>;
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
  const { userName, partnerName, plannerName } = useUserProfileData();
  
  // State for inline editing
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  
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

  const formatDisplayAmount = (amount: number) => {
    if (amount === 0) {
      return '-';
    }
    return formattedAmount;
  };

  const isOverBudget = useMemo(() => {
    // This could be enhanced with category data if needed
    return false;
  }, []);

  // Assignment handlers
  const handleAssignBudgetItem = async (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[]) => {
    if (!onAssign) return;
    
    try {
      // Pass the itemId as the last parameter
      await onAssign(assigneeIds, assigneeNames, assigneeTypes, budgetItem.id!);
      setShowAssignmentModal(false);
    } catch (error) {
      console.error('Error assigning budget item:', error);
    }
  };

  // Get assignee info for display
  const getAssigneeInfo = () => {
    if (!budgetItem.assignedTo) return null;
    
    // Handle both old string format and new array format
    const assigneeIds = Array.isArray(budgetItem.assignedTo) ? budgetItem.assignedTo : [budgetItem.assignedTo];
    if (assigneeIds.length === 0) return null;
    
    // For now, show the first assignee (we'll update this to show multiple avatars later)
    const firstAssigneeId = assigneeIds[0];
    
    // Check if it's the current user
    if (firstAssigneeId === user?.uid) {
      return {
        id: user.uid,
        name: userName || 'You',
        type: 'user' as const,
      };
    }
    
    // Check if it's partner or planner
    if (firstAssigneeId === 'partner' && partnerName) {
      return {
        id: 'partner',
        name: partnerName,
        type: 'user' as const,
      };
    }
    
    if (firstAssigneeId === 'planner' && plannerName) {
      return {
        id: 'planner',
        name: plannerName,
        type: 'user' as const,
      };
    }
    
    return null;
  };

  const assigneeInfo = getAssigneeInfo();

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
    <>
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
                  onClick={() => setShowAssignmentModal(true)}
                  className="w-full text-left px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2"
                >
                  <UserPlus size={14} />
                  Assign
                </button>
              )}
              <button
                onClick={() => onDeleteItem(budgetItem.id!)}
                className="p-1 hover:bg-gray-100 rounded-full"
                title="Delete"
              >
                <Trash2 size={16} className="text-red-500" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Amount section */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-[#A85C36]" />
          {editing.editingField === 'amount' ? (
            <EditableField
              value={budgetItem.amount.toString()}
              isEditing={true}
              onStartEdit={handleAmountClick}
              onSave={handleAmountSave}
              onCancel={editing.cancelEdit}
              type="number"
              placeholder="0"
              className="text-sm font-semibold text-[#A85C36] w-24"
              disabled={budgetItem.isCompleted}
              showEditIcon={false}
            />
          ) : (
            <div
              onClick={handleAmountClick}
              className="text-sm font-semibold text-[#A85C36] w-24 cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5 transition-colors"
              title="Click to edit"
            >
              {formatDisplayAmount(budgetItem.amount)}
            </div>
          )}
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

      {/* Assignment section */}
      <div className="mt-2">
        <div className="flex items-center gap-1">
          <UserPlus size={14} className="text-[#364257] mt-0.5" />
          {budgetItem.assignedTo && (Array.isArray(budgetItem.assignedTo) ? budgetItem.assignedTo.length > 0 : budgetItem.assignedTo) ? (
            <button
              onClick={() => setShowAssignmentModal(true)}
              disabled={budgetItem.isCompleted}
              className={`flex items-center hover:opacity-80 transition-opacity ${
                budgetItem.isCompleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={budgetItem.isCompleted ? 'Mark as incomplete to reassign' : 'Click to reassign'}
            >
              <div className="flex items-center -space-x-2">
                {(Array.isArray(budgetItem.assignedTo) ? budgetItem.assignedTo : [budgetItem.assignedTo]).slice(0, 3).map((assigneeId, index) => {
                  // Get assignee info for each ID
                  let assigneeName = '';
                  let assigneeProfileImageUrl: string | undefined = undefined;
                  
                  if (assigneeId === user?.uid) {
                    assigneeName = userName || 'You';
                  } else if (assigneeId === 'partner' && partnerName) {
                    assigneeName = partnerName;
                  } else if (assigneeId === 'planner' && plannerName) {
                    assigneeName = plannerName;
                  }
                  
                  return (
                    <div key={assigneeId} className="relative">
                      <div className="border border-white rounded-full">
                        <UserAvatar
                          userId={assigneeId}
                          userName={assigneeName}
                          profileImageUrl={assigneeProfileImageUrl}
                          size="sm"
                          showTooltip={true}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {Array.isArray(budgetItem.assignedTo) && budgetItem.assignedTo.length > 3 && (
                <div className="ml-1 w-6 h-6 rounded-full bg-[#A85C36] text-white text-xs font-medium flex items-center justify-center border border-white">
                  +{budgetItem.assignedTo.length - 3}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowAssignmentModal(true)}
              disabled={budgetItem.isCompleted}
              className={`flex items-center gap-1 text-xs text-[#364257] underline hover:text-[#A85C36] transition-colors ${
                budgetItem.isCompleted ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={budgetItem.isCompleted ? 'Mark as incomplete to assign' : 'Assign to someone'}
            >
              <UserPlus size={12} />
              Assign
            </button>
          )}
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
            onClick={() => setShowAssignmentModal(true)}
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

    {/* Assignment Modal */}
    <TodoAssignmentModal
      isOpen={showAssignmentModal}
      onClose={() => setShowAssignmentModal(false)}
      onAssign={handleAssignBudgetItem}
      currentAssignees={budgetItem.assignedTo ? (Array.isArray(budgetItem.assignedTo) ? budgetItem.assignedTo : [budgetItem.assignedTo]).map(assigneeId => {
        let assigneeName = '';
        let assigneeType: 'user' | 'contact' = 'user';
        let assigneeRole = '';
        
        if (assigneeId === user?.uid) {
          assigneeName = userName || 'You';
          assigneeRole = 'You';
        } else if (assigneeId === 'partner' && partnerName) {
          assigneeName = partnerName;
          assigneeRole = 'Partner';
        } else if (assigneeId === 'planner' && plannerName) {
          assigneeName = plannerName;
          assigneeRole = 'Wedding Planner';
        }
        
        return {
          id: assigneeId,
          name: assigneeName,
          type: assigneeType,
          role: assigneeRole,
        };
      }) : []}
      contacts={[]}
    />
    </>
  );
};

export default BudgetItemComponent; 