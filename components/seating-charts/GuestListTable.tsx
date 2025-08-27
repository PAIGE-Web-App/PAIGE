import React from 'react';
import { Plus, Upload } from 'lucide-react';
import { Guest, GuestColumn, WizardState } from './types';
import GuestTableHeader from './GuestTableHeader';
import GuestTableRow from './GuestTableRow';

interface GuestListTableProps {
  wizardState: WizardState;
  guestColumns: GuestColumn[];
  areChartDetailsComplete: boolean;
  onAddGuest: () => void;
  onUpdateGuest: (guestId: string, field: keyof Guest | string, value: string) => void;
  onRemoveGuest: (guestId: string) => void;
  onUpdateColumn: (columnId: string, updates: Partial<GuestColumn>) => void;
  onRemoveColumn: (columnId: string) => void;
  onSetEditingState: (updates: Partial<WizardState>) => void;
  onShowCSVUploadModal: () => void;
  onShowAddColumnModal: () => void;
  onShowMealOptionsModal: (options: string[]) => void;
  getCellValue: (guest: Guest, fieldKey: string) => string;
  // Drag & Drop handlers
  onDragStart: (e: React.DragEvent, columnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetColumnId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export default function GuestListTable({
  wizardState,
  guestColumns,
  areChartDetailsComplete,
  onAddGuest,
  onUpdateGuest,
  onRemoveGuest,
  onUpdateColumn,
  onRemoveColumn,
  onSetEditingState,
  onShowCSVUploadModal,
  onShowAddColumnModal,
  onShowMealOptionsModal,
  getCellValue,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}: GuestListTableProps) {
  return (
    <div className={`bg-white rounded-[5px] border border-[#AB9C95] p-6 relative ${!areChartDetailsComplete ? 'opacity-50 pointer-events-none' : ''}`}>
      {!areChartDetailsComplete && (
        <div className="absolute inset-0 bg-white bg-opacity-75 rounded-[5px] flex items-center justify-center z-10">
          <div className="text-center">
            <p className="text-[#AB9C95] mb-2">Complete Chart Details first</p>
            <p className="text-sm text-[#AB9C95]">Please fill in Chart Name and Event Type</p>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-playfair font-semibold text-[#332B42]">Guest List</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onShowCSVUploadModal}
            className="accent-color hover:accent-color-hover underline flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>
          {wizardState.guests.length > 0 && (
            <div className="flex items-center gap-3 ml-6">
              <button
                onClick={onShowAddColumnModal}
                className="btn-primaryinverse flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Column
              </button>
              <button
                onClick={onAddGuest}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Guest
              </button>
            </div>
          )}
        </div>
      </div>

      {wizardState.guests.length === 0 ? (
        <div className="text-center py-8">
          <img
            src="/SeatingArrangement.png"
            alt="Seating Arrangement"
            className="w-20 mx-auto mb-4"
          />
          <button
            onClick={onAddGuest}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Add First Guest
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden">
          {/* Simple Table with Horizontal Scroll */}
          <div className="overflow-x-auto">
            <table className="w-full" style={{ 
              minWidth: `${(guestColumns.length + 2) * 150 + 100}px`,
              tableLayout: 'fixed'
            }}>
              <GuestTableHeader
                guestColumns={guestColumns}
                onUpdateColumn={onUpdateColumn}
                onRemoveColumn={onRemoveColumn}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
              />

              {/* Table Body */}
              <tbody>
                {wizardState.guests.map((guest, index) => (
                  <GuestTableRow
                    key={guest.id}
                    guest={guest}
                    index={index}
                    guestColumns={guestColumns}
                    wizardState={wizardState}
                    onUpdateGuest={onUpdateGuest}
                    onRemoveGuest={onRemoveGuest}
                    onSetEditingState={onSetEditingState}
                    onShowMealOptionsModal={onShowMealOptionsModal}
                    getCellValue={getCellValue}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
