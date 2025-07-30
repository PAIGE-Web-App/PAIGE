import React from 'react';
import { X, Edit2, Link, DollarSign, Calendar, FileText } from 'lucide-react';
import { BudgetItem, BudgetCategory } from '@/types/budget';

interface BudgetItemSideCardProps {
  isOpen: boolean;
  onClose: () => void;
  budgetItem: BudgetItem | null;
  category: BudgetCategory | null;
  onEdit: () => void;
  onLinkVendor: () => void;
}

const BudgetItemSideCard: React.FC<BudgetItemSideCardProps> = ({
  isOpen,
  onClose,
  budgetItem,
  category,
  onEdit,
  onLinkVendor,
}) => {
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

  if (!isOpen || !budgetItem) {
    return null;
  }

  return (
    <div className="w-80 bg-white border-l border-[#AB9C95] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#AB9C95]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#332B42]">Budget Item Details</h2>
          <button
            onClick={onClose}
            className="p-1 text-[#AB9C95] hover:text-[#332B42] hover:bg-[#F3F2F0] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="btn-primary flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Item
          </button>
          <button
            onClick={onLinkVendor}
            className="btn-secondary flex items-center gap-2"
          >
            <Link className="w-4 h-4" />
            Link Vendor
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-xl font-semibold text-[#332B42] mb-2">
            {budgetItem.name}
          </h3>
          {category && (
            <p className="text-sm text-[#AB9C95] mb-4">
              Category: {category.name}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-[#A85C36]" />
            <span className="font-medium text-[#332B42]">Amount</span>
          </div>
          <div className="text-2xl font-bold text-[#A85C36]">
            {formatDisplayAmount(budgetItem.amount)}
          </div>
        </div>

        {/* Notes */}
        {budgetItem.notes && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-[#AB9C95]" />
              <span className="font-medium text-[#332B42]">Notes</span>
            </div>
            <p className="text-sm text-[#332B42] bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-3">
              {budgetItem.notes}
            </p>
          </div>
        )}

        {/* Vendor Info */}
        {budgetItem.vendorName && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link className="w-4 h-4 text-[#AB9C95]" />
              <span className="font-medium text-[#332B42]">Linked Vendor</span>
            </div>
            <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-[5px] p-3">
              <p className="font-medium text-[#332B42]">{budgetItem.vendorName}</p>
              {budgetItem.vendorId && (
                <p className="text-xs text-[#AB9C95] mt-1">ID: {budgetItem.vendorId}</p>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-[#332B42]">Status</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${budgetItem.isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm text-[#332B42]">
              {budgetItem.isCompleted ? 'Completed' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Dates */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[#AB9C95]" />
            <span className="font-medium text-[#332B42]">Dates</span>
          </div>
          <div className="space-y-2 text-sm text-[#332B42]">
            <div>
              <span className="text-[#AB9C95]">Created:</span>
              <span className="ml-2">
                {budgetItem.createdAt.toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-[#AB9C95]">Updated:</span>
              <span className="ml-2">
                {budgetItem.updatedAt.toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Item Type */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-[#332B42]">Item Type</span>
          </div>
          <div className="text-sm text-[#332B42]">
            <span className={`px-2 py-1 rounded-full text-xs ${
              budgetItem.isCustom 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {budgetItem.isCustom ? 'Custom Item' : 'Standard Item'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetItemSideCard; 