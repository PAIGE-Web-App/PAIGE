import React from 'react';
import { Guest, GuestColumn, WizardState } from './types';
import { Sparkles } from 'lucide-react';

interface GuestListTableTanStackBasicProps {
  wizardState: WizardState;
  guestColumns: GuestColumn[];
  onUpdateGuest: (guestId: string, field: keyof Guest | string, value: string) => void;
  onRemoveGuest: (guestId: string) => void;
  onColumnResize?: (columnId: string, newWidth: number) => void;
  onGenerateAllNotes?: () => void;
  onShowMealOptionsModal?: (options: string[]) => void;
  onShowRelationshipOptionsModal?: (options: string[]) => void;
}

export default function GuestListTableTanStackBasic({
  wizardState,
  guestColumns,
  onUpdateGuest,
  onRemoveGuest,
  onGenerateAllNotes,
  onShowMealOptionsModal,
  onShowRelationshipOptionsModal,
}: GuestListTableTanStackBasicProps) {
  return (
    <div className="bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse">
          {/* Header */}
          <thead>
            <tr className="bg-[#F8F6F4]">
              <th className="p-3 text-left text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] whitespace-nowrap">
                Full Name*
              </th>
              {guestColumns.map((column) => (
                <th key={column.id} className="p-3 text-left text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <span>{column.label}</span>
                    <div className="flex items-center gap-1">
                      {column.id === 'notes' && onGenerateAllNotes && (
                        <button
                          onClick={onGenerateAllNotes}
                          className="flex items-center gap-1 text-xs text-[#A85C36] hover:text-[#8B4513] transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          Generate
                        </button>
                      )}
                      {column.id === 'mealPreference' && onShowMealOptionsModal && (
                        <button
                          onClick={() => onShowMealOptionsModal(column.options || [])}
                          className="text-xs text-[#AB9C95] hover:text-[#332B42] transition-colors"
                          title="Edit meal options"
                        >
                          ⚙️
                        </button>
                      )}
                      {column.id === 'relationship' && onShowRelationshipOptionsModal && (
                        <button
                          onClick={() => onShowRelationshipOptionsModal(column.options || [])}
                          className="text-xs text-[#AB9C95] hover:text-[#332B42] transition-colors"
                          title="Edit relationship options"
                        >
                          ⚙️
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              ))}
              <th className="p-3 text-center text-sm font-medium text-[#AB9C95] whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {wizardState.guests.map((guest, index) => (
              <tr
                key={guest.id}
                className={`border-b border-[#E0DBD7] last:border-b-0 hover:bg-[#F8F6F4] ${
                  index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]'
                }`}
              >
                <td className="p-3 border-r border-[#E0DBD7] whitespace-nowrap">
                  <input
                    type="text"
                    value={guest.fullName || ''}
                    onChange={(e) => onUpdateGuest(guest.id, 'fullName', e.target.value)}
                    className="w-full border-none bg-transparent text-[#332B42] focus:outline-none"
                    placeholder="Full Name"
                  />
                </td>
                {guestColumns.map((column) => {
                  const cellValue = guest[column.key as keyof Guest] as string || '';
                  
                  return (
                    <td key={column.id} className="p-3 border-r border-[#E0DBD7] whitespace-nowrap">
                      {column.type === 'select' && column.options ? (
                        <div className="relative">
                          <select
                            value={cellValue}
                            onChange={(e) => onUpdateGuest(guest.id, column.key, e.target.value)}
                            className="w-full border border-[#AB9C95] px-2 py-1 text-sm rounded bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] pr-6"
                          >
                            <option value="">Select</option>
                            {column.options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <svg
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#AB9C95]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      ) : (
                        <input
                          type={column.type === 'number' ? 'number' : 'text'}
                          value={cellValue}
                          onChange={(e) => onUpdateGuest(guest.id, column.key, e.target.value)}
                          className={`w-full px-2 py-1 text-sm text-[#332B42] focus:outline-none ${
                            column.id === 'notes' 
                              ? 'border-none bg-transparent' 
                              : 'border border-[#AB9C95] rounded bg-white focus:ring-2 focus:ring-[#A85C36]'
                          }`}
                          placeholder={column.label}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="p-3 whitespace-nowrap text-center">
                  <button
                    onClick={() => onRemoveGuest(guest.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Remove guest"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
