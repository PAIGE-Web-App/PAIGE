import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Link, UserPlus, DollarSign, NotepadText, MoreHorizontal, CheckCircle, Circle, Plus } from 'lucide-react';
import { BudgetItem } from '@/types/budget';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import toast from 'react-hot-toast';
import EditableField from './common/EditableField';

interface BudgetItemsTableProps {
  budgetItems: BudgetItem[];
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (item: BudgetItem) => void;
  onAssign?: (item: BudgetItem) => void;
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
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

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

  // totalAmount is now memoized above

  return (
    <div className="flex flex-col bg-white h-full min-h-0">
      {/* Table Header - Fixed */}
      <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-t-[5px] p-3 flex-shrink-0">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-[#AB9C95]">
          <div className="col-span-3">Item Name</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-4">Notes</div>
          <div className="col-span-2">Vendor</div>
          <div className="col-span-1 text-center">Actions</div>
        </div>
      </div>

      {/* Table Body - Scrollable */}
      <div className="flex-1 overflow-y-auto border border-t-0 border-[#E0DBD7] min-h-0">
        {budgetItems.length === 0 ? (
          <div className="p-8 text-center text-[#AB9C95]">
            <p className="text-sm mb-2">No budget items yet</p>
            <button
              onClick={onAddItem}
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
                <div className="col-span-2 flex items-center justify-end">
                  <EditableField
                    value={item.amount.toString()}
                    isEditing={editingCell?.itemId === item.id && editingCell?.field === 'amount'}
                    onStartEdit={() => handleEditStart(item, 'amount')}
                    onSave={(value) => handleEditSave(item, value)}
                    onCancel={handleEditCancel}
                    type="number"
                    placeholder="0"
                    className="text-sm font-medium text-[#332B42] text-right"
                    showEditIcon={true}
                  />
                </div>

                {/* Notes */}
                <div className="col-span-4 flex items-center">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLinkVendor(item);
                    }}
                    className="flex items-center gap-1 text-sm text-[#A85C36] hover:underline"
                  >
                    <Link className="w-3 h-3" />
                    {item.vendorName || 'Link Vendor'}
                  </button>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssign?.(item);
                    }}
                    className="p-1 hover:bg-[#EBE3DD] rounded"
                    title="Assign"
                  >
                    <UserPlus className="w-3 h-3 text-[#AB9C95]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      item.id && onDeleteItem(item.id);
                    }}
                    className="p-1 hover:bg-[#FDEAEA] rounded"
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

      {/* Total Row - Fixed at Bottom */}
      <div className="bg-[#F8F6F4] border-t-2 border-[#A85C36] p-3 flex-shrink-0">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3">
            <span className="text-sm font-medium text-[#332B42]">Total</span>
          </div>
          <div className="col-span-2 text-right">
            <span className="text-sm font-bold text-[#332B42]">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="col-span-7"></div>
        </div>
      </div>
    </div>
  );
};

export default BudgetItemsTable; 