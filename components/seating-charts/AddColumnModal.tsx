import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { GuestColumn } from './types';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (columnData: Omit<GuestColumn, 'id' | 'order'>) => void;
}

export default function AddColumnModal({ isOpen, onClose, onAddColumn }: AddColumnModalProps) {
  const [columnName, setColumnName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'select' | 'number'>('text');
  const [dropdownOptions, setDropdownOptions] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [columnNameError, setColumnNameError] = useState('');

  // Show/hide dropdown options based on field type
  const showDropdownOptions = fieldType === 'select';

  const handleSubmit = () => {
    if (!columnName.trim()) {
      setColumnNameError('Column name is required');
      return;
    }

    const columnData: Omit<GuestColumn, 'id' | 'order'> = {
      key: `custom-${Date.now()}`,
      label: columnName.trim(),
      type: fieldType,
      isRequired,
      isEditable: true,
      isRemovable: true,
      options: fieldType === 'select' ? dropdownOptions.split('\n').filter(opt => opt.trim()) : undefined
    };

    onAddColumn(columnData);
    handleClose();
  };

  const handleClose = () => {
    setColumnName('');
    setFieldType('text');
    setDropdownOptions('');
    setIsRequired(false);
    setColumnNameError('');
    onClose();
  };

  // Reset error when user types
  useEffect(() => {
    if (columnName.trim()) {
      setColumnNameError('');
    }
  }, [columnName]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-white rounded-[5px] p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h5 className="h5 text-[#332B42] font-work-sans">Add New Column</h5>
          <button
            onClick={handleClose}
            className="text-[#AB9C95] hover:text-[#332B42] transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Column Name */}
          <div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#332B42] font-work-sans">Column Name</span>
              <input
                type="text"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                className={`w-full border px-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] font-work-sans ${
                  columnNameError ? 'border-red-500' : 'border-[#AB9C95]'
                }`}
                placeholder="Enter column name"
              />
            </label>
            {columnNameError && <div className="text-xs text-red-500 mt-1 font-work-sans">{columnNameError}</div>}
          </div>

          {/* Field Type */}
          <div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#332B42] font-work-sans">Field Type</span>
              <div className="relative">
                <select
                  id="fieldType"
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as 'text' | 'select' | 'number')}
                  className="w-full border pr-10 pl-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] border-[#AB9C95] font-work-sans"
                >
                  <option value="text">Text Entry</option>
                  <option value="select">Dropdown</option>
                  <option value="number">Number</option>
                </select>
                {/* Custom chevron icon */}
                <svg
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#332B42]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </label>
          </div>

          {/* Dropdown Options */}
          <div id="dropdownOptions" className={showDropdownOptions ? 'block' : 'hidden'}>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#332B42] font-work-sans">Dropdown Options (one per line)</span>
              <textarea
                id="dropdownOptionsText"
                value={dropdownOptions}
                onChange={(e) => setDropdownOptions(e.target.value)}
                rows={4}
                className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] resize-none font-work-sans"
                placeholder="Enter your options here..."
              />
              <div className="text-xs text-[#AB9C95] mt-1 flex items-center gap-2 font-work-sans">
                <span>Example format:</span>
                <div className="bg-[#F8F6F4] px-2 py-1 rounded text-[#7A7A7A] font-mono text-xs">
                  Option 1
                  <br />
                  Option 2
                  <br />
                  Option 3
                </div>
              </div>
            </label>
          </div>

          {/* Required Field */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRequired"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="rounded border-[#AB9C95] text-[#A85C36] focus:ring-[#A85C36]"
            />
            <label htmlFor="isRequired" className="text-sm text-[#332B42] font-work-sans">
              This field is required
            </label>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="btn-primaryinverse"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
          >
            Add Column
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
