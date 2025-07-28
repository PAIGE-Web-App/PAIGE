import React, { useState } from 'react';
import { Edit2, Trash2, Link, UserPlus, DollarSign, NotepadText, MoreHorizontal, CheckCircle, Circle, Plus } from 'lucide-react';
import { BudgetItem } from '@/types/budget';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import toast from 'react-hot-toast';

interface BudgetItemsTableProps {
  budgetItems: BudgetItem[];
  onDeleteItem: (itemId: string) => void;
  onLinkVendor: (item: BudgetItem) => void;
  onAssign?: (item: BudgetItem) => void;
  onAddItem: () => void;
}

const BudgetItemsTable: React.FC<BudgetItemsTableProps> = ({
  budgetItems,
  onDeleteItem,
  onLinkVendor,
  onAssign,
  onAddItem,
}) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

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

  const handleEditSave = async (item: BudgetItem) => {
    if (!editingCell || !user) return;

    try {
      const updates: any = {};
      
      if (editingCell.field === 'amount') {
        const numValue = parseFloat(editValue);
        if (isNaN(numValue)) {
          showErrorToast('Please enter a valid amount');
          return;
        }
        updates.amount = numValue;
      } else if (editingCell.field === 'name') {
        if (!editValue.trim()) {
          showErrorToast('Name cannot be empty');
          return;
        }
        updates.name = editValue.trim();
      } else if (editingCell.field === 'notes') {
        updates.notes = editValue.trim() || null;
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

  const totalAmount = budgetItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex-1 flex flex-col bg-white">
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
      <div className="flex-1 overflow-y-auto border border-t-0 border-[#E0DBD7]">
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
                }`}
              >
                {/* Item Name */}
                <div 
                  className="col-span-3 flex items-center"
                  onClick={() => handleEditStart(item, 'name')}
                >
                  {editingCell && editingCell.itemId === item.id && editingCell.field === 'name' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      onBlur={() => handleEditSave(item)}
                      className="w-full px-2 py-1 border border-[#A85C36] rounded text-sm"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-sm text-[#332B42] flex-1">{item.name}</span>
                      <Edit2 className="w-3 h-3 text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div 
                  className="col-span-2 flex items-center justify-end"
                  onClick={() => handleEditStart(item, 'amount')}
                >
                  {editingCell && editingCell.itemId === item.id && editingCell.field === 'amount' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      onBlur={() => handleEditSave(item)}
                      className="w-full px-2 py-1 border border-[#A85C36] rounded text-sm text-right"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#332B42]">
                        {formatCurrency(item.amount)}
                      </span>
                      <Edit2 className="w-3 h-3 text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div 
                  className="col-span-4 flex items-center"
                  onClick={() => handleEditStart(item, 'notes')}
                >
                  {editingCell && editingCell.itemId === item.id && editingCell.field === 'notes' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      onBlur={() => handleEditSave(item)}
                      className="w-full px-2 py-1 border border-[#A85C36] rounded text-sm"
                      placeholder="Add notes..."
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-sm text-[#AB9C95] flex-1 truncate">
                        {item.notes || '—'}
                      </span>
                      <NotepadText className="w-3 h-3 text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
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
                    <Trash2 className="w-3 h-3 text-red-500" />
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