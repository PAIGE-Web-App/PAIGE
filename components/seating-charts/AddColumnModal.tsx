import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { GuestColumn } from './types';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (columnData: Omit<GuestColumn, 'id' | 'order'>) => void;
  guestColumns: GuestColumn[];
  onToggleColumnVisibility: (columnId: string) => void;
}

export default function AddColumnModal({ isOpen, onClose, onAddColumn, guestColumns, onToggleColumnVisibility }: AddColumnModalProps) {
  const [columnName, setColumnName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'select' | 'number'>('text');
  const [dropdownOptions, setDropdownOptions] = useState('');
  const [columnNameError, setColumnNameError] = useState('');
  const [showNewColumnFields, setShowNewColumnFields] = useState(false);

  // Show/hide dropdown options based on field type
  const showDropdownOptions = fieldType === 'select';

  // Default columns configuration
  const defaultColumns = [
    {
      id: 'fullName',
      label: 'Full Name',
      description: 'Guest\'s complete name (required)',
      isRequired: true,
      isToggleable: false
    },
    {
              id: 'relationship',
        label: 'Relationship to You',
              description: 'How the guest is related to you (the couple)',
      isRequired: false,
      isToggleable: true
    },
    {
      id: 'mealPreference',
      label: 'Meal Preference',
      description: 'Dietary preferences and restrictions',
      isRequired: false,
      isToggleable: true
    },
    {
      id: 'notes',
      label: 'Notes/Seating Arrangement',
      description: 'AI-generated seating recommendations and notes',
      isRequired: false,
      isToggleable: true
    }
  ];

  // Check if a column is currently visible
  const isColumnVisible = (columnId: string) => {
    return guestColumns.some(col => col.id === columnId);
  };

  const handleSubmit = () => {
    if (!columnName.trim()) {
      setColumnNameError('Column name is required');
      return;
    }

    const columnData: Omit<GuestColumn, 'id' | 'order'> = {
      key: `custom-${Date.now()}`,
      label: columnName.trim(),
      type: fieldType,
      isRequired: false,
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
    setColumnNameError('');
    setShowNewColumnFields(false);
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
        className="bg-white rounded-[5px] max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[#E0DBD7] flex-shrink-0">
          <h5 className="h5 text-[#332B42] font-work-sans">Manage Columns</h5>
          <button
            onClick={handleClose}
            className="text-[#AB9C95] hover:text-[#332B42] transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Middle Section */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {/* Default Columns Section */}
          <div className="mb-6">
          <h6 className="text-sm font-medium text-[#332B42] font-work-sans mb-2">Default (Recommended) Columns</h6>
          <p className="text-xs text-[#AB9C95] mb-4 font-work-sans">
            Toggle visibility for recommended columns. Full Name cannot be hidden as it's required.
          </p>
          
          <div className="space-y-3">
            {defaultColumns.map((column) => (
              <div key={column.id} className="flex items-center justify-between p-3 bg-[#F8F6F4] rounded-[5px]">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#332B42] font-work-sans">
                      {column.label}
                    </span>
                    {column.isRequired && (
                      <span className="text-xs text-[#A85C36] font-work-sans">(Required)</span>
                    )}
                  </div>
                  <p className="text-xs text-[#AB9C95] mt-1 font-work-sans">
                    {column.description}
                  </p>
                </div>
                
                <div className="ml-4">
                  {column.isToggleable ? (
                    <button
                      onClick={() => onToggleColumnVisibility(column.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                        isColumnVisible(column.id) ? 'bg-[#A85C36]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          isColumnVisible(column.id) ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="text-xs text-[#AB9C95] font-work-sans px-2 py-1 bg-gray-200 rounded">
                      Always On
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Separator Line */}
          <div className="mt-4 mb-4">
            <div className="border-t border-[#E0DBD7]"></div>
          </div>
          
          {/* Add New Button */}
          {!showNewColumnFields && (
            <div>
              <button
                onClick={() => setShowNewColumnFields(true)}
                className="btn-primaryinverse w-full flex items-center justify-center gap-2"
              >
                <span>+</span>
                Add New
              </button>
            </div>
          )}
        </div>

        {/* Form - Conditionally Rendered */}
        {showNewColumnFields && (
          <div className="space-y-4">
          {/* Form Header with Hide Button */}
          <div className="flex items-center justify-between">
            <h6 className="text-sm font-medium text-[#332B42] font-work-sans">Add Custom Column</h6>
            <button
              onClick={() => setShowNewColumnFields(false)}
              className="text-xs text-[#AB9C95] hover:text-[#332B42] transition-colors font-work-sans"
            >
              Hide
            </button>
          </div>
          
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

          </div>
        )}
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-[#E0DBD7] flex-shrink-0">
          <button
            onClick={handleClose}
            className="btn-primaryinverse"
          >
            Cancel
          </button>
          {showNewColumnFields && (
            <button
              onClick={handleSubmit}
              className="btn-primary"
            >
              Add Column
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
