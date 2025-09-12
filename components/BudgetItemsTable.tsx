import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Link, UserPlus, DollarSign, NotepadText, MoreHorizontal, CheckCircle, Circle, Plus } from 'lucide-react';
import { BudgetItem } from '@/types/budget';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';

import EditableField from './common/EditableField';
import TodoAssignmentModal from './TodoAssignmentModal';
import UserAvatar from './UserAvatar';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { getAssigneeAvatarColor, getRoleBasedAvatarColor } from '@/utils/assigneeAvatarColors';

interface BudgetItemsTableProps {
  budgetItems: BudgetItem[];
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (item: BudgetItem) => void;
  onAssign?: (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[], itemId: string) => Promise<void>;
  onAddItem: () => void;
  newlyAddedItems?: Set<string>;
}

const BudgetItemsTable: React.FC<BudgetItemsTableProps> = ({
  budgetItems,
  onDeleteItem,
  onLinkVendor,
  onAssign,
  onAddItem,
  newlyAddedItems = new Set(),
}) => {
  const { user, profileImageUrl } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { userName, partnerName, plannerName } = useUserProfileData();
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedItemForAssignment, setSelectedItemForAssignment] = useState<BudgetItem | null>(null);

  // Memoized values for performance
  const totalAmount = useMemo(() => {
    return budgetItems.reduce((sum, item) => sum + item.amount, 0);
  }, [budgetItems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDisplayAmount = (amount: number) => {
    if (amount === 0) {
      return '-';
    }
    return formatCurrency(amount);
  };

  const handleEditStart = (item: BudgetItem, field: string) => {
    if (!item.id) return;
    setEditingCell({ itemId: item.id, field });
    setEditValue(field === 'amount' ? item.amount.toString() : (item[field as keyof BudgetItem]?.toString() || ''));
  };

  const handleEditSave = async (item: BudgetItem, value?: string) => {
    if (!editingCell || !user) return;

    try {
      const updates: any = {};
      const valueToUse = value || editValue;
      
      if (editingCell.field === 'amount') {
        const numValue = parseFloat(valueToUse);
        if (isNaN(numValue)) {
          showErrorToast('Please enter a valid amount');
          return;
        }
        updates.amount = numValue;
      } else if (editingCell.field === 'name') {
        if (!valueToUse.trim()) {
          showErrorToast('Name cannot be empty');
          return;
        }
        updates.name = valueToUse.trim();
      } else if (editingCell.field === 'notes') {
        updates.notes = valueToUse.trim() || null;
      }

      updates.updatedAt = new Date();

      await updateDoc(doc(getUserCollectionRef('budgetItems', user.uid), item.id), updates);
      showSuccessToast('Budget item updated successfully!');
    } catch (error: any) {
      console.error('Error updating budget item:', error);
      showErrorToast(`Failed to update budget item: ${error.message}`);
    } finally {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleEditCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, item: BudgetItem) => {
    if (e.key === 'Enter') {
      handleEditSave(item);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  // Assignment handlers
  const handleAssignBudgetItem = async (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[]) => {
    if (!onAssign || !selectedItemForAssignment) return;
    
    try {
      await onAssign(assigneeIds, assigneeNames, assigneeTypes, selectedItemForAssignment.id!);
      setShowAssignmentModal(false);
      setSelectedItemForAssignment(null);
    } catch (error) {
      console.error('Error assigning budget item:', error);
    }
  };

  const handleAssignClick = (item: BudgetItem) => {
    setSelectedItemForAssignment(item);
    setShowAssignmentModal(true);
  };

  // totalAmount is now memoized above

  return (
    <div className="flex flex-col bg-white h-full min-h-[400px] border border-[#E0DBD7] rounded-[5px] overflow-hidden">
      {/* Table Header - Fixed */}
      <div className="bg-[#F8F6F4] border-b border-[#E0DBD7] rounded-t-[5px] p-3 flex-shrink-0">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-[#AB9C95]">
          <div className="col-span-3">Item Name</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Notes</div>
          <div className="col-span-2">Vendor</div>
          <div className="col-span-2 text-center">Assignees</div>
          <div className="col-span-1 text-center">Actions</div>
        </div>
      </div>

      {/* Table Body - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {budgetItems.length === 0 ? (
          <div className="p-8 text-center text-[#AB9C95]">
            <p className="text-sm mb-2">No budget items yet</p>
            <button
              onClick={() => {
                // This is handled by the parent component via triggerAddItem
                console.log('Add item button clicked - handled by parent');
              }}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add First Item
            </button>
          </div>
        ) : (
          <>
            {budgetItems.map((item, index) => (
              <div
                key={item.id}
                className={`grid grid-cols-12 gap-4 p-3 border-b border-[#E0DBD7] last:border-b-0 hover:bg-[#F8F6F4] transition-colors group cursor-pointer ${
                  index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]'
                } ${newlyAddedItems.has(item.id!) ? 'bg-green-100' : ''}`}
              >
                {/* Item Name */}
                <div className="col-span-3 flex items-center">
                  <EditableField
                    value={item.name}
                    isEditing={editingCell?.itemId === item.id && editingCell?.field === 'name'}
                    onStartEdit={() => handleEditStart(item, 'name')}
                    onSave={(value) => handleEditSave(item, value)}
                    onCancel={handleEditCancel}
                    placeholder="Enter item name..."
                    className="text-sm text-[#332B42] flex-1"
                    showEditIcon={true}
                  />
                </div>

                {/* Amount */}
                <div className="col-span-2 flex items-center">
                  {editingCell?.itemId === item.id && editingCell?.field === 'amount' ? (
                    <EditableField
                      value={item.amount.toString()}
                      isEditing={true}
                      onStartEdit={() => handleEditStart(item, 'amount')}
                      onSave={(value) => handleEditSave(item, value)}
                      onCancel={handleEditCancel}
                      type="number"
                      placeholder="0"
                      className="text-sm font-medium text-[#332B42] flex-1"
                      showEditIcon={false}
                    />
                  ) : (
                    <div
                      onClick={() => handleEditStart(item, 'amount')}
                      className="flex items-center gap-2 w-full cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5 transition-colors text-sm font-medium text-[#332B42] flex-1"
                      title="Click to edit"
                    >
                      <span className="flex-1 truncate">{formatDisplayAmount(item.amount)}</span>
                      <Edit2 className="w-3 h-3 text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="col-span-2 flex items-center">
                  <EditableField
                    value={item.notes || ''}
                    isEditing={editingCell?.itemId === item.id && editingCell?.field === 'notes'}
                    onStartEdit={() => handleEditStart(item, 'notes')}
                    onSave={(value) => handleEditSave(item, value)}
                    onCancel={handleEditCancel}
                    placeholder="Add notes..."
                    className="text-sm text-[#AB9C95] flex-1 truncate"
                    showEditIcon={true}
                  />
                </div>

                {/* Vendor */}
                <div className="col-span-2 flex items-center">
                  {item.vendorName ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show vendor details or allow unlinking
                        onLinkVendor(item);
                      }}
                      className="flex items-center gap-1 text-sm text-[#A85C36] hover:underline"
                      title="Click to view vendor details or change vendor"
                    >
                      <Link className="w-3 h-3" />
                      {item.vendorName}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLinkVendor(item);
                      }}
                      className="flex items-center gap-1 text-sm text-[#A85C36] hover:underline"
                      title="Link a vendor to this budget item"
                    >
                      <Link className="w-3 h-3" />
                      Link Vendor
                    </button>
                  )}
                </div>

                {/* Assignees */}
                <div className="col-span-2 flex items-center justify-center">
                  {item.assignedTo && (Array.isArray(item.assignedTo) ? item.assignedTo.length > 0 : item.assignedTo) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignClick(item);
                      }}
                      className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
                      title="Click to reassign"
                    >
                      <div className="flex items-center -space-x-1">
                        {(Array.isArray(item.assignedTo) ? item.assignedTo : [item.assignedTo]).slice(0, 4).map((assigneeId, index) => {
                          // Get assignee info for each ID
                          let assigneeName = '';
                          let assigneeProfileImageUrl: string | undefined = undefined;
                          
                          if (assigneeId === user?.uid) {
                            assigneeName = userName || 'You';
                            assigneeProfileImageUrl = profileImageUrl || undefined;
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
                                  avatarColor={assigneeId === user?.uid
                                    ? getRoleBasedAvatarColor('user')
                                    : assigneeId === 'partner'
                                    ? getRoleBasedAvatarColor('partner')
                                    : assigneeId === 'planner'
                                    ? getRoleBasedAvatarColor('planner')
                                    : getAssigneeAvatarColor(assigneeId)
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {Array.isArray(item.assignedTo) && item.assignedTo.length > 4 && (
                        <div className="ml-1 w-4 h-4 rounded-full bg-[#A85C36] text-white text-xs font-medium flex items-center justify-center border border-white">
                          +{item.assignedTo.length - 4}
                        </div>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignClick(item);
                      }}
                      className="p-1 hover:bg-[#EBE3DD] rounded"
                      title="Assign"
                    >
                      <UserPlus className="w-3 h-3 text-[#AB9C95]" />
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      item.id && onDeleteItem(item.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}


          </>
        )}
      </div>



      {/* Assignment Modal */}
      {selectedItemForAssignment && (
        <TodoAssignmentModal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedItemForAssignment(null);
          }}
          onAssign={handleAssignBudgetItem}
          currentAssignees={selectedItemForAssignment.assignedTo ? (Array.isArray(selectedItemForAssignment.assignedTo) ? selectedItemForAssignment.assignedTo : [selectedItemForAssignment.assignedTo]).map(assigneeId => {
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
      )}
    </div>
  );
};

export default BudgetItemsTable; 