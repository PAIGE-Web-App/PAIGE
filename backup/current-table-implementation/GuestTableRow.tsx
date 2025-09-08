import React from 'react';
import { Trash2 } from 'lucide-react';
import { Guest, GuestColumn, WizardState } from './types';

interface GuestTableRowProps {
  guest: Guest;
  index: number;
  guestColumns: GuestColumn[];
  wizardState: WizardState;
  onUpdateGuest: (guestId: string, field: keyof Guest | string, value: string) => void;
  onRemoveGuest: (guestId: string) => void;
  onSetEditingState: (updates: Partial<WizardState>) => void;
  onShowMealOptionsModal: (options: string[], columnKey: string) => void;
  getCellValue: (guest: Guest, fieldKey: string) => string;
  fullNameColumnWidth?: number;
}

export default function GuestTableRow({
  guest,
  index,
  guestColumns,
  wizardState,
  onUpdateGuest,
  onRemoveGuest,
  onSetEditingState,
  onShowMealOptionsModal,
  getCellValue,
  fullNameColumnWidth = 200
}: GuestTableRowProps) {
  const handleCellClick = (fieldKey: string) => {
    const editingKey = `editing_${guest.id}_${fieldKey}`;
    onSetEditingState({ [editingKey]: true });
  };

  const handleCellBlur = (fieldKey: string) => {
    const editingKey = `editing_${guest.id}_${fieldKey}`;
    onSetEditingState({ [editingKey]: false });
    // Auto-save will be handled by parent component
  };

  const handleMealPreferenceChange = (value: string) => {
    onUpdateGuest(guest.id, 'mealPreference', value);
    // Auto-save will be handled by parent component
  };

  return (
    <tr
      className={`border-b border-[#E0DBD7] last:border-b-0 hover:bg-[#F8F6F4] transition-all duration-200 ${
        index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]'
      }`}
    >
      {/* Fixed Full Name Column */}
      <td 
        className="p-3 border-r-2 border-[#AB9C95] whitespace-nowrap overflow-hidden"
        style={{ 
          width: `${fullNameColumnWidth}px`,
          minWidth: `${fullNameColumnWidth}px`,
          maxWidth: `${fullNameColumnWidth}px`,
          position: 'sticky',
          left: 0,
          zIndex: 5,
          backgroundColor: index % 2 === 0 ? 'white' : '#FAF9F8',
          boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
        }}
      >
        <div
          className="w-full min-h-[40px] flex items-center cursor-text hover:bg-[#FEFEFD] rounded px-2 py-1 transition-colors"
          onClick={() => handleCellClick('fullName')}
        >
          {wizardState[`editing_${guest.id}_fullName` as keyof WizardState] ? (
            <input
              type="text"
              value={guest.fullName || ''}
              onChange={(e) => onUpdateGuest(guest.id, 'fullName', e.target.value)}
              onBlur={() => handleCellBlur('fullName')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellBlur('fullName');
                } else if (e.key === 'Escape') {
                  handleCellBlur('fullName');
                }
              }}
              className="w-full text-sm text-[#332B42] bg-transparent border-none outline-none focus:ring-0"
              autoFocus
              placeholder="Full Name"
            />
          ) : (
            <span className="text-sm text-[#332B42] flex-1 truncate block">
              {guest.fullName || (
                <span className="text-[#AB9C95]">Full Name</span>
              )}
            </span>
          )}
        </div>
      </td>
      
      {/* Dynamic Columns */}
      {guestColumns.map((column, index) => (
        <td 
          key={column.id} 
          className="p-3 border-r border-[#E0DBD7] last:border-r-0 whitespace-nowrap overflow-hidden"
          style={{ 
            width: `${column.width || 150}px`,
            minWidth: `${column.width || 150}px`,
            maxWidth: `${column.width || 150}px`,
            transform: `translateX(${index * 0}px)`
          }}
        >
          {column.type === 'select' ? (
            <div className="relative">
              <select
                value={getCellValue(guest, column.key)}
                onChange={(e) => {
                  if (e.target.value === '__edit_options__') {
                    // Find column options for any dropdown column
                    const currentColumn = guestColumns.find(col => col.id === column.id);
                    if (currentColumn?.options) {
                      onShowMealOptionsModal([...currentColumn.options], currentColumn.key);
                    }
                    return;
                  }
                  
                  if (column.key === 'mealPreference') {
                    handleMealPreferenceChange(e.target.value);
                  } else {
                    onUpdateGuest(guest.id, column.key, e.target.value);
                  }
                }}
                className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] pr-10"
              >
                <option value="">Select</option>
                {column.options?.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
                {/* Edit Options option for all dropdown columns */}
                {column.type === 'select' && (
                  <option value="__edit_options__" className="text-[#A85C36] font-medium">
                    ✏️ Edit Options...
                  </option>
                )}
              </select>
              {/* Custom chevron icon */}
              <svg
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AB9C95]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          ) : (
            <div
              className="w-full min-h-[40px] flex items-center cursor-text hover:bg-[#FEFEFD] rounded px-2 py-1 transition-colors"
              onClick={() => handleCellClick(column.key)}
            >
              {wizardState[`editing_${guest.id}_${column.key}` as keyof WizardState] ? (
                <input
                  type={column.type}
                  value={getCellValue(guest, column.key)}
                  onChange={(e) => onUpdateGuest(guest.id, column.key, e.target.value)}
                  onBlur={() => handleCellBlur(column.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCellBlur(column.key);
                    } else if (e.key === 'Escape') {
                      handleCellBlur(column.key);
                    }
                  }}
                  className="w-full text-sm text-[#332B42] bg-transparent border-none outline-none focus:ring-0"
                  autoFocus
                  placeholder={column.label}
                />
              ) : (
                <span 
                  className="text-sm text-[#332B42] flex-1 truncate block cursor-text"
                  title={getCellValue(guest, column.key) || column.label}
                >
                  {getCellValue(guest, column.key) || (
                    <span className="text-[#AB9C95]">{column.label}</span>
                  )}
                </span>
              )}
            </div>
          )}
        </td>
      ))}
      
      {/* Actions Column */}
      <td className={`p-3 text-center border-l border-[#E0DBD7] ${
        index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]'
      }`} style={{ width: '60px' }}>
        <button
          onClick={() => onRemoveGuest(guest.id)}
          className="p-2 hover:bg-[#F3F2F0] rounded transition-colors"
          title="Delete"
        >
          <Trash2 size={16} className="text-red-500" />
        </button>
      </td>
    </tr>
  );
}
