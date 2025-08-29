import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { TableType } from '../../types/seatingChart';

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTable: (table: Omit<TableType, 'id'>) => void;
}

const TABLE_TYPES = [
  { id: 'round', name: 'Round Table', icon: '●' },
  { id: 'long', name: 'Long Table', icon: '▭' },
  { id: 'oval', name: 'Oval Table', icon: '▭' },
  { id: 'square', name: 'Square Table', icon: '▭' }
];

const DEFAULT_CAPACITIES = {
  round: [4, 6, 8, 10, 12],
  long: [2, 4, 6, 8, 10],
  oval: [4, 6, 8, 10],
  square: [4, 6, 8, 10]
};

export default function AddTableModal({ isOpen, onClose, onAddTable }: AddTableModalProps) {
  const [tableData, setTableData] = useState({
    name: '',
    type: 'round' as keyof typeof DEFAULT_CAPACITIES,
    capacity: 4,
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tableData.name.trim()) {
      onAddTable({
        name: tableData.name.trim(),
        type: tableData.type,
        capacity: tableData.capacity,
        description: tableData.description.trim() || '',
        isDefault: false
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setTableData({
      name: '',
      type: 'round',
      capacity: 4,
      description: ''
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header row with title and close button */}
            <div className="flex items-center justify-between mb-4">
              <h5 className="h5 text-[#332B42]">Add New Table</h5>
              <button
                onClick={handleClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Description */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 text-left">
                Configure your new table for the seating chart. Choose the table type, capacity, and give it a name.
              </p>
            </div>

            {/* Table Type Selection */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Table Type:</h6>
              <div className="grid grid-cols-2 gap-3">
                {TABLE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setTableData(prev => ({ 
                      ...prev, 
                      type: type.id as keyof typeof DEFAULT_CAPACITIES,
                      capacity: DEFAULT_CAPACITIES[type.id as keyof typeof DEFAULT_CAPACITIES][0]
                    }))}
                    className={`p-3 rounded-[5px] border-2 transition-all ${
                      tableData.type === type.id
                        ? 'border-[#A85C36] bg-[#A85C36]/10 text-[#A85C36]'
                        : 'border-[#AB9C95] hover:border-[#A85C36] text-[#332B42]'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-sm font-medium">{type.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Capacity Selection */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Seating Capacity:</h6>
              <input
                type="number"
                min="1"
                max="20"
                value={tableData.capacity}
                onChange={(e) => setTableData(prev => ({ 
                  ...prev, 
                  capacity: parseInt(e.target.value) || 1
                }))}
                className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
              />
            </div>

            {/* Table Name */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Table Name:</h6>
              <input
                type="text"
                value={tableData.name}
                onChange={(e) => setTableData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Head Table, Family Table 1"
                className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Description (Optional):</h6>
              <input
                type="text"
                value={tableData.description}
                onChange={(e) => setTableData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Near the dance floor, Close to entrance"
                className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!tableData.name.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Table
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
