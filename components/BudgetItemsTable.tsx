import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Link, UserPlus, DollarSign, NotepadText, MoreHorizontal, CheckCircle, Circle, Plus } from 'lucide-react';
import { BudgetItem } from '@/types/budget';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';
import { doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';

import EditableField from './common/EditableField';
import TodoAssignmentModal from './TodoAssignmentModal';
import UserAvatar from './UserAvatar';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { getAssigneeAvatarColor, getRoleBasedAvatarColor } from '@/utils/assigneeAvatarColors';
import PrePopulatedBudgetItems from './budget/PrePopulatedBudgetItems';

interface BudgetItemsTableProps {
  budgetItems: BudgetItem[];
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (item: BudgetItem) => void;
  onAssign?: (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[], itemId: string) => Promise<void>;
  onAddItem: () => void;
  onAddMultipleItems?: (items: Array<{name: string; amount: number; notes?: string}>) => void;
  selectedCategoryId?: string;
  selectedCategoryName?: string;
  newlyAddedItems?: Set<string>;
}

const BudgetItemsTable: React.FC<BudgetItemsTableProps> = ({
  budgetItems,
  onDeleteItem,
  onLinkVendor,
  onAssign,
  onAddItem,
  onAddMultipleItems,
  selectedCategoryId,
  selectedCategoryName,
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
    
    let value = '';
    if (field === 'amount') {
      value = item.amount.toString();
    } else if (field === 'amountSpent') {
      value = (item.amountSpent || 0).toString();
    } else if (field === 'dueDate') {
      value = item.dueDate ? new Date(item.dueDate.getTime() - item.dueDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : '';
    } else {
      value = (item[field as keyof BudgetItem]?.toString() || '');
    }
    
    setEditValue(value);
  };

  const handleEditSave = async (item: BudgetItem, value?: string, field?: string) => {
    if (!user) return;

    try {
      const updates: any = {};
      const valueToUse = value || editValue;
      const fieldToUse = field || editingCell?.field;
      
      if (!fieldToUse) return;

      if (fieldToUse === 'amount') {
        const numValue = parseFloat(valueToUse);
        if (isNaN(numValue)) {
          showErrorToast('Please enter a valid amount');
          return;
        }
        updates.amount = numValue;
      } else if (fieldToUse === 'amountSpent') {
        const numValue = parseFloat(valueToUse);
        if (isNaN(numValue)) {
          showErrorToast('Please enter a valid amount');
          return;
        }
        updates.amountSpent = numValue;
      } else if (fieldToUse === 'name') {
        if (!valueToUse.trim()) {
          showErrorToast('Name cannot be empty');
          return;
        }
        updates.name = valueToUse.trim();
      } else if (fieldToUse === 'notes') {
        updates.notes = valueToUse.trim() || null;
      } else if (fieldToUse === 'dueDate') {
        if (valueToUse) {
          updates.dueDate = new Date(valueToUse);
        } else {
          updates.dueDate = null;
        }
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

  const handleTogglePaid = async (item: BudgetItem) => {
    if (!user || !item.id) return;

    try {
      const updates: any = {
        isPaid: !item.isPaid,
        updatedAt: new Date(),
      };

      // If marking as paid and no amount spent is set, default to the planned amount
      if (!item.isPaid && item.amountSpent === undefined) {
        updates.amountSpent = item.amount;
      }

      // If marking as unpaid, clear the amount spent
      if (item.isPaid) {
        updates.amountSpent = null;
      }

      await updateDoc(doc(getUserCollectionRef('budgetItems', user.uid), item.id), updates);
      showSuccessToast(`Item ${!item.isPaid ? 'marked as paid' : 'marked as unpaid'}!`);
    } catch (error: any) {
      console.error('Error toggling payment status:', error);
      showErrorToast(`Failed to update payment status: ${error.message}`);
    }
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

  // Handle adding multiple pre-populated items
  const handleAddPrePopulatedItems = async (items: Array<{name: string; amount: number; notes?: string}>) => {
    if (!user || !selectedCategoryId || !onAddMultipleItems) {
      showErrorToast('Unable to add items. Please try again.');
      return;
    }

    try {
      await onAddMultipleItems(items);
      showSuccessToast(`Added ${items.length} budget items successfully!`);
    } catch (error: any) {
      console.error('Error adding multiple budget items:', error);
      showErrorToast(`Failed to add items: ${error.message}`);
    }
  };

  // totalAmount is now memoized above

  return (
    <div className="flex flex-col bg-white h-full min-h-0 overflow-hidden">
      {/* Table Header - Fixed */}
      <div className="bg-[#F8F6F4] border-b border-[#E0DBD7] p-3 flex-shrink-0">
        {/* Desktop: Full columns */}
        <div className="hidden lg:grid gap-2 text-sm text-[#AB9C95] font-medium whitespace-nowrap" style={{ gridTemplateColumns: '2fr 2fr 1.5fr 120px 140px 60px 140px 80px' }}>
          <div>Item Name</div>
          <div>Notes</div>
          <div>Vendor</div>
          <div>Due Date</div>
          <div className="text-right">Projected Amount</div>
          <div className="text-center">Paid</div>
          <div className="text-right">Spent Amount</div>
          <div className="text-center">Actions</div>
        </div>
        {/* Mobile: Simplified columns */}
        <div className="lg:hidden grid grid-cols-12 gap-2 text-sm text-[#AB9C95] font-medium whitespace-nowrap">
          <div className="col-span-7">Item Name</div>
          <div className="col-span-3 text-right">Amount</div>
          <div className="col-span-2 text-center">Actions</div>
        </div>
      </div>

      {/* Table Body - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {budgetItems.length === 0 ? (
          <PrePopulatedBudgetItems
            onAddItems={handleAddPrePopulatedItems}
            selectedCategoryName={selectedCategoryName}
          />
        ) : (
          <>
            {budgetItems.map((item, index) => (
              <div
                key={item.id}
                className={`border-b border-[#E0DBD7] last:border-b-0 hover:bg-[#F8F6F4] transition-colors group cursor-pointer ${
                  index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]'
                } ${newlyAddedItems.has(item.id!) ? 'bg-green-100' : ''}`}
              >
                {/* Desktop: Full columns */}
                <div className="hidden lg:grid gap-2 p-3" style={{ gridTemplateColumns: '2fr 2fr 1.5fr 120px 140px 60px 140px 80px' }}>
                {/* Item Name */}
                <div className="flex items-start">
                  <EditableField
                    value={item.name}
                    isEditing={editingCell?.itemId === item.id && editingCell?.field === 'name'}
                    onStartEdit={() => handleEditStart(item, 'name')}
                    onSave={(value) => handleEditSave(item, value, 'name')}
                    onCancel={handleEditCancel}
                    placeholder="Enter item name..."
                    className="text-sm text-[#332B42] flex-1 break-words"
                    showEditIcon={true}
                  />
                </div>

                {/* Notes */}
                <div className="flex items-start">
                  <EditableField
                    value={item.notes || ''}
                    isEditing={editingCell?.itemId === item.id && editingCell?.field === 'notes'}
                    onStartEdit={() => handleEditStart(item, 'notes')}
                    onSave={(value) => handleEditSave(item, value, 'notes')}
                    onCancel={handleEditCancel}
                    placeholder="Add notes..."
                    className="text-sm text-[#AB9C95] flex-1 break-words"
                    showEditIcon={true}
                  />
                </div>

                {/* Vendor */}
                <div className="flex items-start">
                  {item.vendorName ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show vendor details or allow unlinking
                        onLinkVendor(item);
                      }}
                      className="flex items-center gap-1 text-sm text-[#A85C36] hover:underline truncate"
                      title="Click to view vendor details or change vendor"
                    >
                      <Link className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.vendorName}</span>
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
                      <span className="text-xs">Link</span>
                    </button>
                  )}
                </div>

                {/* Due Date */}
                <div className="flex items-start">
                  {editingCell?.itemId === item.id && editingCell?.field === 'dueDate' ? (
                    <div className="flex items-center w-full">
                      <input
                        type="date"
                        value={item.dueDate ? new Date(item.dueDate.getTime() - item.dueDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            // Create date in local timezone to avoid timezone offset issues
                            const localDate = new Date(e.target.value + 'T12:00:00');
                            handleEditSave(item, localDate.toISOString(), 'dueDate');
                          } else {
                            handleEditSave(item, '', 'dueDate');
                          }
                          setEditingCell(null);
                        }}
                        onBlur={(e) => {
                          // Only close if the focus is moving outside the date input
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setEditingCell(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-[#332B42] border border-[#AB9C95] rounded-[3px] px-2 py-1 w-full max-w-full"
                        autoFocus
                        style={{ width: '100%', minWidth: '0' }}
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => handleEditStart(item, 'dueDate')}
                      className="flex items-center gap-2 w-full cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5 transition-colors text-sm text-[#332B42] flex-1"
                      title="Click to edit due date"
                    >
                      <span className="flex-1 truncate">
                        {item.dueDate ? item.dueDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        }) : '-'}
                      </span>
                      <Edit2 className="w-3 h-3 text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  )}
                </div>

                {/* Projected Amount */}
                <div className="flex items-start justify-end">
                  {editingCell?.itemId === item.id && editingCell?.field === 'amount' ? (
                    <EditableField
                      value={item.amount.toString()}
                      isEditing={true}
                      onStartEdit={() => handleEditStart(item, 'amount')}
                      onSave={(value) => handleEditSave(item, value, 'amount')}
                      onCancel={handleEditCancel}
                      type="number"
                      placeholder="0"
                      className="text-sm text-[#332B42] flex-1"
                      showEditIcon={false}
                    />
                  ) : (
                    <div
                      onClick={() => handleEditStart(item, 'amount')}
                      className="flex items-center gap-2 w-full cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5 transition-colors text-sm text-[#332B42] flex-1"
                      title="Click to edit planned amount"
                    >
                      <span className="flex-1 truncate text-right">{formatDisplayAmount(item.amount)}</span>
                      <Edit2 className="w-3 h-3 text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  )}
                </div>

                {/* Paid Toggle */}
                <div className="flex items-start justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePaid(item);
                    }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      item.isPaid 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                    title={item.isPaid ? 'Mark as unpaid' : 'Mark as paid'}
                  >
                    {item.isPaid && <CheckCircle className="w-3 h-3 text-white" />}
                  </button>
                </div>

                {/* Amount Spent */}
                <div className="flex items-start justify-end">
                  {item.isPaid ? (
                    editingCell?.itemId === item.id && editingCell?.field === 'amountSpent' ? (
                      <EditableField
                        value={(item.amountSpent || 0).toString()}
                        isEditing={true}
                        onStartEdit={() => handleEditStart(item, 'amountSpent')}
                        onSave={(value) => handleEditSave(item, value, 'amountSpent')}
                        onCancel={handleEditCancel}
                        type="number"
                        placeholder="0"
                        className="text-sm text-[#332B42] flex-1"
                        showEditIcon={false}
                      />
                    ) : (
                      <div
                        onClick={() => handleEditStart(item, 'amountSpent')}
                        className="flex items-center gap-2 w-full cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5 transition-colors text-sm text-[#332B42] flex-1"
                        title="Click to edit amount spent"
                      >
                        <span className="flex-1 truncate text-right">{formatDisplayAmount(item.amountSpent || 0)}</span>
                        <Edit2 className="w-3 h-3 text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    )
                  ) : (
                    <div className="text-sm text-[#AB9C95] flex-1 text-right">-</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-start justify-center">
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

                {/* Mobile: Simplified columns */}
                <div className="lg:hidden grid grid-cols-12 gap-2 p-3">
                  {/* Item Name */}
                  <div className="col-span-7 flex items-start">
                    <EditableField
                      value={item.name}
                      isEditing={editingCell?.itemId === item.id && editingCell?.field === 'name'}
                      onStartEdit={() => handleEditStart(item, 'name')}
                      onSave={(value) => handleEditSave(item, value, 'name')}
                      onCancel={handleEditCancel}
                      placeholder="Enter item name..."
                      className="text-sm text-[#332B42] flex-1 break-words"
                      showEditIcon={true}
                    />
                  </div>

                  {/* Amount */}
                  <div className="col-span-3 flex items-start justify-end">
                    {editingCell?.itemId === item.id && editingCell?.field === 'amount' ? (
                      <EditableField
                        value={item.amount.toString()}
                        isEditing={true}
                        onStartEdit={() => handleEditStart(item, 'amount')}
                        onSave={(value) => handleEditSave(item, value, 'amount')}
                        onCancel={handleEditCancel}
                        type="number"
                        placeholder="0"
                        className="text-sm text-[#332B42] flex-1"
                        showEditIcon={false}
                      />
                    ) : (
                      <div
                        onClick={() => handleEditStart(item, 'amount')}
                        className="flex items-center gap-2 w-full cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5 transition-colors text-sm text-[#332B42] flex-1"
                        title="Click to edit"
                      >
                        <span className="flex-1 truncate text-right">{formatDisplayAmount(item.amount)}</span>
                        <Edit2 className="w-3 h-3 text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-start justify-center">
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