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
  onShowMealOptionsModal: (options: string[]) => void;
  getCellValue: (guest: Guest, fieldKey: string) => string;
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
  getCellValue
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
    if (value === '__edit_options__') {
      // Find meal preference column options
      const mealColumn = guestColumns.find(col => col.key === 'mealPreference');
      if (mealColumn?.options) {
        onShowMealOptionsModal([...mealColumn.options]);
      }
      return;
    }
    
    onUpdateGuest(guest.id, 'mealPreference', value);
    // Auto-save will be handled by parent component
  };

  return (
    <tr
      className={`border-b border-[#E0DBD7] last:border-b-0 hover:bg-[#F8F6F4] transition-colors ${
        index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]'
      }`}
    >
      {/* Fixed First Name Column */}
      <td 
        className="p-3 border-r border-[#E0DBD7] whitespace-nowrap overflow-hidden"
        style={{ width: '150px' }}
      >
        <div
          className="w-full min-h-[40px] flex items-center cursor-text hover:bg-[#FEFEFD] rounded px-2 py-1 transition-colors"
          onClick={() => handleCellClick('firstName')}
        >
          {wizardState[`editing_${guest.id}_firstName` as keyof WizardState] ? (
            <input
              type="text"
              value={guest.firstName || ''}
              onChange={(e) => onUpdateGuest(guest.id, 'firstName', e.target.value)}
              onBlur={() => handleCellBlur('firstName')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellBlur('firstName');
                } else if (e.key === 'Escape') {
                  handleCellBlur('firstName');
                }
              }}
              className="w-full text-sm text-[#332B42] bg-transparent border-none outline-none focus:ring-0"
              autoFocus
              placeholder="First Name"
            />
          ) : (
            <span className="text-sm text-[#332B42] flex-1 truncate block">
              {guest.firstName || (
                <span className="text-[#AB9C95]">First Name</span>
              )}
            </span>
          )}
        </div>
      </td>
      
      {/* Fixed Last Name Column */}
      <td 
        className="p-3 border-r border-[#E0DBD7] whitespace-nowrap overflow-hidden"
        style={{ width: '150px' }}
      >
        <div
          className="w-full min-h-[40px] flex items-center cursor-text hover:bg-[#FEFEFD] rounded px-2 py-1 transition-colors"
          onClick={() => handleCellClick('lastName')}
        >
          {wizardState[`editing_${guest.id}_lastName` as keyof WizardState] ? (
            <input
              type="text"
              value={guest.lastName || ''}
              onChange={(e) => onUpdateGuest(guest.id, 'lastName', e.target.value)}
              onBlur={() => handleCellBlur('lastName')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellBlur('lastName');
                } else if (e.key === 'Escape') {
                  handleCellBlur('lastName');
                }
              }}
              className="w-full text-sm text-[#332B42] bg-transparent border-none outline-none focus:ring-0"
              autoFocus
              placeholder="Last Name"
            />
          ) : (
            <span className="text-sm text-[#332B42] flex-1 truncate block">
              {guest.lastName || (
                <span className="text-[#AB9C95]">Last Name</span>
              )}
            </span>
          )}
        </div>
      </td>
      
      {/* Dynamic Columns */}
      {guestColumns.map((column) => (
        <td 
          key={column.id} 
          className="p-3 border-r border-[#E0DBD7] last:border-r-0 whitespace-nowrap overflow-hidden"
          style={{ width: '150px' }}
        >
          {column.type === 'select' ? (
            <div className="relative">
              <select
                value={getCellValue(guest, column.key)}
                onChange={(e) => {
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
                {/* Edit Options option for meal preference */}
                {column.key === 'mealPreference' && (
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
      }`} style={{ width: '100px' }}>
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
